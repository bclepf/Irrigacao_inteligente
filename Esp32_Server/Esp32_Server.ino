#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <LittleFS.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

const char* ssid = "Clepf-2.4G";
const char* password = "cristina1525";

AsyncWebServer server(80);

// --- PINOS DE HARDWARE ---
const int pinoAlimentacaoSensor = 33; 
const int pinoLeituraSensor = 32;     // Obrigatório ser ADC1 (ex: 32 a 35)
const int pinoRele = 25;

// --- LIMITES E VARIÁVEIS DO SENSOR ---
const int limiteSeco = 400; 
const int limiteUmido = 600; 
int leituraUmidade = 0;

// --- ESTADOS DO SISTEMA ---
bool irrigando = false;
bool chuvaPrevista = false;
bool comandoManual = false;
bool jaRegouNestaLeitura = false; // Evita que regue sem parar durante os 5 minutos
bool climaDisponivel = false;

// --- PREVISAO DO TEMPO (Open-Meteo / Varginha-MG) ---
const char* urlPrevisaoClima = "https://api.open-meteo.com/v1/forecast?latitude=-21.55139&longitude=-45.43028&hourly=relative_humidity_2m,precipitation_probability,precipitation&forecast_hours=12&timezone=America%2FSao_Paulo";
const int janelaPrevisaoHoras = 12;
const int limiteProbabilidadeChuva = 60; // %
const float limitePrecipitacaoMm = 0.2;  // mm na janela analisada
const int limiteUmidadeAr = 85;          // %

int probabilidadeChuvaMax = 0;
float precipitacaoPrevistaMm = 0.0;
int umidadeArMax = 0;
String proximaChuva = "";
String motivoClima = "Clima ainda nao consultado";

// --- TEMPORIZADORES (millis) ---
unsigned long ultimaLeituraSensor = 0;
const long intervaloLeitura = 300000; // 5 minutos (5 * 60 * 1000 ms)

unsigned long ultimaChecagemClima = 0;
const long intervaloClima = 600000;   // 10 minutos

unsigned long tempoInicioIrrigacao = 0;
long duracaoIrrigacao = 15000; // Agora pode ser alterada via painel (padrão 15s)

void checarPrevisaoClima();

void setup() {
  Serial.begin(115200);

  // 1. CONFIGURAÇÃO DE HARDWARE
  pinMode(pinoAlimentacaoSensor, OUTPUT);
  pinMode(pinoRele, OUTPUT); 
  
  // Como é lógica invertida, HIGH garante a válvula fechada na inicialização
  digitalWrite(pinoRele, HIGH);
  
  // Força a ESP32 a ler o sinal analógico de 0 a 1023
  analogReadResolution(10); 

  // 2. INICIALIZAÇÃO DO SISTEMA DE ARQUIVOS
  if(!LittleFS.begin(true)){
    Serial.println("Erro ao montar LittleFS");
    return;
  }

  // 3. CONEXÃO WI-FI
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConectado! IP: " + WiFi.localIP().toString());

  // 4. ROTAS DO SERVIDOR WEB
  server.on("/status", HTTP_GET, [](AsyncWebServerRequest *request){
    String json = "{\"umidade\":" + String(leituraUmidade) + 
                  ",\"rele\":" + String(irrigando) + 
                  ",\"chuva\":" + String(chuvaPrevista) + 
                  ",\"manual\":" + String(comandoManual) +
                  ",\"climaDisponivel\":" + String(climaDisponivel) +
                  ",\"probabilidadeChuva\":" + String(probabilidadeChuvaMax) +
                  ",\"precipitacaoPrevista\":" + String(precipitacaoPrevistaMm, 1) +
                  ",\"umidadeAr\":" + String(umidadeArMax) +
                  ",\"janelaPrevisaoHoras\":" + String(janelaPrevisaoHoras) +
                  ",\"proximaChuva\":\"" + proximaChuva +
                  "\",\"motivoClima\":\"" + motivoClima + "\"}";
    request->send(200, "application/json", json);
  });

  // Rota para acionamento manual já com o tempo dinâmico escolhido no frontend
  server.on("/toggle", HTTP_POST, [](AsyncWebServerRequest *request){
    if (request->hasParam("tempo")) {
      duracaoIrrigacao = request->getParam("tempo")->value().toInt() * 1000;
    }
    comandoManual = true; 
    request->send(200, "text/plain", "OK");
  });

  // Nova rota: Configura o tempo padrão para a próxima rega automática
  server.on("/config", HTTP_POST, [](AsyncWebServerRequest *request){
    if (request->hasParam("tempo")) {
      duracaoIrrigacao = request->getParam("tempo")->value().toInt() * 1000;
    }
    request->send(200, "text/plain", "OK");
  });

  server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");
  server.onNotFound([](AsyncWebServerRequest *request) {
    request->send(LittleFS, "/index.html", "text/html");
  });

  server.begin();
  checarPrevisaoClima();
  ultimaChecagemClima = millis();
}

void loop() {
  unsigned long tempoAtual = millis();

  // --- LÓGICA 1: LEITURA DO SENSOR (A cada 5 Minutos) ---
  if (tempoAtual - ultimaLeituraSensor >= intervaloLeitura || ultimaLeituraSensor == 0) {
    ultimaLeituraSensor = tempoAtual;

    digitalWrite(pinoAlimentacaoSensor, HIGH);
    delay(10); 
    leituraUmidade = analogRead(pinoLeituraSensor);
    digitalWrite(pinoAlimentacaoSensor, LOW);

    Serial.print("Nova leitura (5 min): ");
    Serial.println(leituraUmidade);
    
    // Libera o sistema para regar novamente, se a terra continuar seca
    jaRegouNestaLeitura = false; 
  }

  // --- LÓGICA 2: CONTROLE DA VÁLVULA DE IRRIGAÇÃO ---
  if (!irrigando) {
    // Avalia se o solo está seco, se há bloqueio climático e se já não foi regado nesta janela
    bool precisaAgua = (leituraUmidade > limiteSeco && !chuvaPrevista && !jaRegouNestaLeitura);

    if (precisaAgua || comandoManual) {
      digitalWrite(pinoRele, LOW); // LOW liga o relé (Lógica Invertida)
      irrigando = true;
      tempoInicioIrrigacao = tempoAtual; // Inicia o cronômetro com base no tempo escolhido
      
      if (precisaAgua) {
        jaRegouNestaLeitura = true; // Trava para não repetir neste ciclo de 5min
        Serial.print("Solo seco! Irrigando por ");
        Serial.print(duracaoIrrigacao / 1000); 
        Serial.println(" segundos...");
      } else {
        Serial.print("Acionamento Manual! Irrigando por ");
        Serial.print(duracaoIrrigacao / 1000);
        Serial.println(" segundos...");
      }
    }
  } 
  else {
    // Verifica se completou a contagem regressiva dinâmica do tempo estipulado
    if (tempoAtual - tempoInicioIrrigacao >= duracaoIrrigacao) {
      digitalWrite(pinoRele, HIGH); // HIGH desliga o relé (Lógica Invertida)
      irrigando = false;
      comandoManual = false; // Reseta a flag manual do dashboard
      Serial.println("Válvula Fechada. Aguardando próximo ciclo de leitura.");
    }
  }

  // --- LÓGICA 3: CHECAGEM DE CLIMA (A cada 10 minutos) ---
  if (tempoAtual - ultimaChecagemClima >= intervaloClima) {
    ultimaChecagemClima = tempoAtual;
    checarPrevisaoClima(); 
  }
}

void checarPrevisaoClima() {
  if (WiFi.status() != WL_CONNECTED) {
    climaDisponivel = false;
    motivoClima = "WiFi desconectado";
    Serial.println("Nao foi possivel consultar clima: WiFi desconectado.");
    return;
  }

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.setTimeout(10000);

  if (!http.begin(client, urlPrevisaoClima)) {
    climaDisponivel = false;
    motivoClima = "Falha ao iniciar HTTPS";
    Serial.println("Nao foi possivel iniciar consulta HTTPS da Open-Meteo.");
    return;
  }

  int httpCode = http.GET();
  if (httpCode != HTTP_CODE_OK) {
    climaDisponivel = false;
    motivoClima = "Erro HTTP " + String(httpCode);
    Serial.println("Erro ao consultar Open-Meteo: HTTP " + String(httpCode));
    http.end();
    return;
  }

  DynamicJsonDocument doc(12288);
  DeserializationError erro = deserializeJson(doc, http.getStream());
  http.end();

  if (erro) {
    climaDisponivel = false;
    motivoClima = "JSON invalido";
    Serial.println("Erro ao interpretar JSON da Open-Meteo.");
    return;
  }

  JsonObject hourly = doc["hourly"];
  JsonArray horarios = hourly["time"];
  JsonArray umidadeAr = hourly["relative_humidity_2m"];
  JsonArray probabilidadeChuva = hourly["precipitation_probability"];
  JsonArray precipitacao = hourly["precipitation"];

  if (umidadeAr.isNull() || probabilidadeChuva.isNull() || precipitacao.isNull()) {
    climaDisponivel = false;
    motivoClima = "Dados de clima ausentes";
    Serial.println("Resposta da Open-Meteo sem dados horarios esperados.");
    return;
  }

  probabilidadeChuvaMax = 0;
  precipitacaoPrevistaMm = 0.0;
  umidadeArMax = 0;
  proximaChuva = "";

  int totalHoras = min(janelaPrevisaoHoras, (int)umidadeAr.size());
  for (int i = 0; i < totalHoras; i++) {
    int probabilidade = probabilidadeChuva[i] | 0;
    float chuvaMm = precipitacao[i] | 0.0;
    int umidade = umidadeAr[i] | 0;

    if (probabilidade > probabilidadeChuvaMax) {
      probabilidadeChuvaMax = probabilidade;
    }

    precipitacaoPrevistaMm += chuvaMm;

    if (umidade > umidadeArMax) {
      grid_cols_1: umidadeArMax = umidade;
    }

    if (proximaChuva == "" && (chuvaMm >= limitePrecipitacaoMm || probabilidade >= limiteProbabilidadeChuva)) {
      proximaChuva = horarios[i] | "";
    }
  }

  bool chuvaNaJanela = precipitacaoPrevistaMm >= limitePrecipitacaoMm || probabilidadeChuvaMax >= limiteProbabilidadeChuva;
  bool arMuitoUmido = umidadeArMax >= limiteUmidadeAr;

  chuvaPrevista = chuvaNaJanela || arMuitoUmido;
  climaDisponivel = true;

  if (chuvaNaJanela && arMuitoUmido) {
    motivoClima = "Chuva prevista ou ar muito umido nas proximas 12h";
  } else if (chuvaNaJanela) {
    motivoClima = "Chuva prevista nas proximas 12h";
  } else if (arMuitoUmido) {
    motivoClima = "Ar muito umido nas proximas 12h";
  } else {
    motivoClima = "Sem bloqueio climatico nas proximas 12h";
  }

  Serial.println("Clima atualizado pela Open-Meteo:");
  Serial.println("  Probabilidade chuva max: " + String(probabilidadeChuvaMax) + "%");
  Serial.println("  Precipitacao prevista: " + String(precipitacaoPrevistaMm, 1) + " mm");
  Serial.println("  Umidade do ar max: " + String(umidadeArMax) + "%");
  Serial.println("  Bloqueia irrigacao automatica: " + String(chuvaPrevista ? "sim" : "nao"));
}