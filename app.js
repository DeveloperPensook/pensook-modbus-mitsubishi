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
    const client = new ModbusRTU();
    let resMessage = [];
    let registers = [];

    for (let i = 0; i < address.length; i++) {
      registers.push({
        address: address[i],
        value: value[i],
      });
    }

    console.log(registers);

    await new Promise((resolve, reject) => {
      client.connectTCP(ip, { port: modbusPort }, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    await writeRegistersSequentially(ip, modbusPort, slaveId, registers);

    await new Promise((resolve, reject) => {
      client.close((err) => {
        if (err) {
          console.error("Error closing connection:", err);
        } else {
          console.log("Connection closed.");
        }
        resolve();
      });
    });

    res.json({ success: true, data: resMessage });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

async function writeRegistersSequentially(ip, modbusPort, slaveId, registers) {
  const client = new ModbusRTU();
  return new Promise(async (resolve, reject) => {
    try {
      await client.connectTCP(ip, { port: modbusPort });

      async function writeNextRegister() {
        if (registers.length === 0) {
          resolve();
          return;
        }

        const register = registers.shift();
        client.setID(slaveId);
        try {
          await client.writeRegisters(register.address, [register.value]);
          resMessage.push(`Register ${register.address} written successfully.`);
        } catch (err) {
          console.error(`Error writing register ${register.address}:`, err);
        }

        writeNextRegister();
      }

      await writeNextRegister();
    } catch (err) {
      reject(err);
    } finally {
      await client.close();
    }
  });
}

app.post("/submit_read", async (req, res) => {
  console.log(req.body);
  const ip = req.body.readIp;
  const port = req.body.readModbusPort;
  const slaveId = req.body.readSlaveId;
  const address = req.body.readAddress;
  const length = req.body.readLength;

  try {
    const client = new ModbusRTU();

    await client.connectTCP(ip, { port: port });
    client.setID(slaveId);
    console.log("Connected successfully");

    const data = await client.readHoldingRegisters(address, length);
    console.log('Holding registers:', data.data);

    await client.close();
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
