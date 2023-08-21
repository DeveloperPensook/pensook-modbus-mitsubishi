const express = require("express");
const ModbusRTU = require("modbus-serial");
const app = express();
const port = 3012;

app.use(express.static("public"));

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post("/submit", async (req, res) => {
  const { ip, port: modbusPort, slaveId, address, value } = req.body;
  console.log(req.body);

  try {
    let resMessage = [];
    let registers = [];

    for (let i = 0; i < address.length; i++) {
      registers.push({
        address: address[i],
        value: value[i],
      });
    }

    console.log(registers);

    function writeRegistersSequentially(ip, modbusPort, slaveId, registers) {
      const client = new ModbusRTU();
        try {
          client.connectTCP(ip, { port: modbusPort });
    
          function writeNextRegister() {
            if (registers.length === 0) {
              resolve();
              return;
            }
    
            const register = registers.shift();
            client.setID(slaveId);
            try {
              client.writeRegisters(register.address, [register.value]);
              resMessage.push(`Register ${register.address} written successfully.`);
            } catch (err) {
              console.error(`Error writing register ${register.address}:`, err);
            }
    
            writeNextRegister();
          }
    
          writeNextRegister();
        } catch (err) {
          reject(err);
        } finally {
          client.close();
        }
    }

    writeRegistersSequentially(ip, modbusPort, slaveId, registers);

    res.json({ success: true, data: resMessage });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/submit_read", async (req, res) => {
  console.log(req.body);
  const ip = req.body.readIp;
  const port = req.body.readModbusPort;
  const slaveId = req.body.readSlaveId;
  const address = req.body.readAddress;
  const length = req.body.readLength;

  try {
    const client = new ModbusRTU();

    client.connectTCP(ip, { port: port });
    client.setID(slaveId);
    console.log("Connected successfully");

    const data = client.readHoldingRegisters(address, length);
    console.log('Holding registers:', data.data);

    client.close();
    console.log('Connection closed');

    res.json({ success: true, data: data.data });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});