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
      return new Promise((resolve, reject) => {
        const client = new ModbusRTU();
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
            resMessage.push(
              `Register ${register.address} written successfully.`
            );
          } catch (err) {
            console.error(`Error writing register ${register.address}:`, err);
          }

          writeNextRegister();
        }

        writeNextRegister();

        client.on("close", () => {
          resolve();
        });

        client.on("error", (err) => {
          reject(err);
        });
      });
    }

    await writeRegistersSequentially(ip, modbusPort, slaveId, registers);

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

    await client.connectTCP(ip, { port: port });
    console.log("Connected successfully");

    client.readHoldingRegisters(slaveId, address, length, (err, data) => {
      if (err) {
        console.error("Error reading holding registers:", err);
      } else {
        console.log("Holding registers:", data.data);
      }

      client.close(() => {
        res.json({ success: true, data: data });
        console.log("Connection closed");
      });
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
