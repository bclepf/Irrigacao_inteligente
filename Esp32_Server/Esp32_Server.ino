#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <LittleFS.h>
#include <HTTPClient.h>
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

// --- TEMPORIZADORES (millis) ---
unsigned long ultimaLeituraSensor = 0;
const long intervaloLeitura = 300000; // 5 minutos (5 * 60 * 1000 ms)

unsigned long ultimaChecagemClima = 0;
const long intervaloClima = 600000;   // 10 minutos

unsigned long tempoInicioIrrigacao = 0;
long duracaoIrrigacao = 15000; // Agora pode ser alterada via painel (padrão 15s)

void setup() {
  Serial.begin(115200);

  // 1. CONFIGURAÇÃO DE HARDWARE
  pinMode(pinoAlimentacaoSensor, OUTPUT);
// Configura o pino como Dreno Aberto (resolve o problema dos 3.3V)
  pinMode(pinoRele, OUTPUT); 
  // Como é lógica invertida, HIGH desliga a válvula no início
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
                  ",\"manual\":" + String(comandoManual) + "}";
    request->send(200, "application/json", json);
  });

// Rota para acionamento manual já com o tempo escolhido
  server.on("/toggle", HTTP_POST, [](AsyncWebServerRequest *request){
    if (request->hasParam("tempo")) {
      duracaoIrrigacao = request->getParam("tempo")->value().toInt() * 1000;
    }
    comandoManual = true; 
    request->send(200, "text/plain", "OK");
  });

  // Nova rota: Apenas atualiza o tempo para a próxima irrigação automática
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
}

void loop() {
  unsigned long tempoAtual = millis();

  // --- LÓGICA 1: LEITURA DO SENSOR (A cada 5 Minutos) ---
  // A condição (ultimaLeituraSensor == 0) força uma leitura imediata ao ligar a placa
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
    // Avalia se o sistema deve abrir a água
    bool precisaAgua = (leituraUmidade > limiteSeco && !chuvaPrevista && !jaRegouNestaLeitura);

    if (precisaAgua || comandoManual) {
      digitalWrite(pinoRele, LOW);
      irrigando = true;
      tempoInicioIrrigacao = tempoAtual; // Inicia o cronômetro de 15s
      
      if (precisaAgua) {
        jaRegouNestaLeitura = true; // Trava para não repetir neste ciclo
        Serial.print("Solo seco! Irrigando por ");
        Serial.print(duracaoIrrigacao / 1000); // Converte de ms para segundos na tela
        Serial.println(" segundos...");
      } else {
        Serial.print("Acionamento Manual! Irrigando por ");
        Serial.print(duracaoIrrigacao / 1000);
        Serial.println(" segundos...");
      }
    }
  } 
  else {
    // Se a água já está ligada, verifica se deram os 15 segundos
    if (tempoAtual - tempoInicioIrrigacao >= duracaoIrrigacao) {
      digitalWrite(pinoRele, HIGH);
      irrigando = false;
      comandoManual = false; // Desarma o botão manual do dashboard
      Serial.println("Válvula Fechada. Aguardando próximo ciclo de leitura.");
    }
  }

  // --- LÓGICA 3: CHECAGEM DE CLIMA ---
  if (tempoAtual - ultimaChecagemClima >= intervaloClima) {
    ultimaChecagemClima = tempoAtual;
    // checarPrevisaoClima(); 
  }
}