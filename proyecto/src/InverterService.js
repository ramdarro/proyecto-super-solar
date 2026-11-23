const ModbusRTU = require("modbus-serial");
const client = new ModbusRTU();

const INVERTER_IP = "192.168.1.100";
const INVERTER_PORT = 502;
const INVERTER_ID = 1;
async function connectToInverter() {
    try {
        await client.connectTCP(INVERTER_IP, { port: INVERTER_PORT });
        client.setID(INVERTER_ID);
        console.log("Conectado al Inversor Real por Modbus TCP");
    } catch (error) {
        console.error("Error conectando al inversor:", error.message);
    }
}

async function readSolarData() {
    try {
        if (!client.isOpen) {
            await connectToInverter();
        }

        const data = await client.readHoldingRegisters(32080, 2); 

        const rawValue = (data.data[0] << 16) | data.data[1]; 
        
        console.log(`Generación Solar Actual: ${rawValue} W`);
        
        return rawValue;

    } catch (error) {
        console.error("Fallo al leer datos del inversor:", error.message);
        return 0;
    }
}

module.exports = {
    connectToInverter,
    readSolarData
};