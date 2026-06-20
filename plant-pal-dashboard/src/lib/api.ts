export interface Plant {
  id: number;
  name: string;
  status: "Adequado" | "Seco" | "Úmido";
  humidity: number;
  lastWatered: string;
  idealHumidity: { min: number; max: number };
  type: string;
  location: string;
  weather?: WeatherStatus;
  wateringDuration: number;
}

export interface WeatherStatus {
  available: boolean;
  shouldSkipWatering: boolean;
  maxRainProbability: number;
  expectedRainMm: number;
  maxAirHumidity: number;
  forecastWindowHours: number;
  nextRainAt: string | null;
  reason: string;
}

export type PlantInput = Omit<Plant, "id" | "status" | "weather">;

const STORAGE_KEY = "sistema_irrigacao_plantas";

// Auxiliar para calcular o status (Seco, Úmido, Adequado)
function computeStatus(humidity: number, ideal: { min: number; max: number }): Plant["status"] {
  if (humidity < ideal.min) return "Seco";
  if (humidity > ideal.max) return "Úmido";
  return "Adequado";
}

// Recupera as plantas salvas no navegador. Se não houver nenhuma, cria uma inicial.
function getStoredPlants(): Plant[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const defaultList: Plant[] = [
      {
        id: 1,
        name: "Zona de Irrigação 1",
        status: "Adequado",
        humidity: 0,
        lastWatered: "Sistema configurado",
        idealHumidity: { min: 40, max: 70 },
        type: "Geral",
        location: "Canteiro Principal",
        wateringDuration: 15
      }
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultList));
    return defaultList;
  }
  return JSON.parse(stored);
}

function savePlants(plantsList: Plant[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plantsList));
}

// Captura e converte o sinal bruto do sensor da ESP32 para porcentagem (0-100%)
export async function getLiveSensorValue(): Promise<{ porcentagem: number; rele: boolean; weather: WeatherStatus }> {
  const resposta = await fetch('/status');
  if (!resposta.ok) {
    throw new Error('Falha ao obter dados do hardware da ESP32');
  }
  const dadosESP32 = await resposta.json();

  const valorAnalogico = dadosESP32.umidade;
  const rangeSensor = 1023 - 300; // Mapeamento: 1023 (Seco) a 300 (Molhado)
  
  let porcentagem = Math.round(((1023 - valorAnalogico) / rangeSensor) * 100);
  porcentagem = Math.max(0, Math.min(100, porcentagem)); // Restringe entre 0% e 100%

  return {
    porcentagem,
    rele: Boolean(dadosESP32.rele),
    weather: {
      available: Boolean(dadosESP32.climaDisponivel),
      shouldSkipWatering: Boolean(dadosESP32.chuva),
      maxRainProbability: Number(dadosESP32.probabilidadeChuva ?? 0),
      expectedRainMm: Number(dadosESP32.precipitacaoPrevista ?? 0),
      maxAirHumidity: Number(dadosESP32.umidadeAr ?? 0),
      forecastWindowHours: Number(dadosESP32.janelaPrevisaoHoras ?? 12),
      nextRainAt: dadosESP32.proximaChuva || null,
      reason: dadosESP32.motivoClima ?? "Clima ainda nao consultado",
    }
  };
}

// 1. BUSCA AS PLANTAS DO STORAGE E SOBREPÕE COM A UMIDADE REAL DO SENSOR
export async function fetchPlants(): Promise<Plant[]> {
  const listaPlantas = getStoredPlants();
  const dadosSensor = await getLiveSensorValue();

  // Toda planta cadastrada exibirá a umidade em tempo real medida pelo sensor da ESP32
  return listaPlantas.map((planta) => ({
    ...planta,
    humidity: dadosSensor.porcentagem,
    status: computeStatus(dadosSensor.porcentagem, planta.idealHumidity),
    lastWatered: dadosSensor.rele ? "Irrigando agora..." : planta.lastWatered,
    weather: dadosSensor.weather,
  }));
}

// 2. ADICIONA UMA NOVA PLANTA (VINCULANDO-A IMEDIATAMENTE À MEDIDA DO SENSOR)
export async function addPlant(input: PlantInput): Promise<Plant> {
  const listaPlantas = getStoredPlants();
  const nextId = listaPlantas.length > 0 ? Math.max(...listaPlantas.map(p => p.id)) + 1 : 1;
  
  // Obtém o valor do sensor no momento exato do cadastro
  const dadosSensor = await getLiveSensorValue();

  const novaPlanta: Plant = {
    ...input,
    id: nextId,
    humidity: dadosSensor.porcentagem,
    status: computeStatus(dadosSensor.porcentagem, input.idealHumidity),
    weather: dadosSensor.weather,
  };

  fetch(`/config?tempo=${novaPlanta.wateringDuration}`, { method: 'POST' }).catch(console.error);

  listaPlantas.push(novaPlanta);
  savePlants(listaPlantas);
  return novaPlanta;
}

// 3. ATUALIZA CONFIGURAÇÕES DA PLANTA
export async function updatePlant(id: number, input: Partial<PlantInput>): Promise<Plant> {
  const listaPlantas = getStoredPlants();
  const idx = listaPlantas.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error("Planta não encontrada");

  listaPlantas[idx] = { ...listaPlantas[idx], ...input };
  
  const dadosSensor = await getLiveSensorValue();
  listaPlantas[idx].humidity = dadosSensor.porcentagem;
  listaPlantas[idx].status = computeStatus(dadosSensor.porcentagem, listaPlantas[idx].idealHumidity);
  listaPlantas[idx].weather = dadosSensor.weather;

  if (input.wateringDuration) {
    fetch(`/config?tempo=${input.wateringDuration}`, { method: 'POST' }).catch(console.error);
  }

  savePlants(listaPlantas);
  return listaPlantas[idx];
}

// 4. REMOVE UMA PLANTA CONFIGURADA
export async function deletePlant(id: number): Promise<void> {
  const listaPlantas = getStoredPlants();
  const filtradas = listaPlantas.filter((p) => p.id !== id);
  savePlants(filtradas);
}

// 5.ACIONA O RELÉ FÍSICO NA ESP32
export async function waterPlant(id: number): Promise<Plant> {

  const listaPlantas = getStoredPlants();
  const idx = listaPlantas.findIndex((p) => p.id === id);

  if (idx !== -1) {
    const tempoDesejado = listaPlantas[idx].wateringDuration;

    const acionamento = await fetch(`/toggle?tempo=${tempoDesejado}`, { method: 'POST' });
    if (!acionamento.ok) {
      throw new Error("Erro ao enviar comando de acionamento do relé para a ESP32");
    }
    
    listaPlantas[idx].lastWatered = "Agora mesmo";
    savePlants(listaPlantas);

    const dadosSensor = await getLiveSensorValue();
    return {
      ...listaPlantas[idx],
      humidity: dadosSensor.porcentagem,
      status: computeStatus(dadosSensor.porcentagem, listaPlantas[idx].idealHumidity),
      weather: dadosSensor.weather,
    };
  }

  throw new Error("Planta não encontrada para acionamento");
}
