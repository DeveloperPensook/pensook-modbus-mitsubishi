const express = require("express");
const ModbusRTU = require("modbus-serial");
const app = express();
const port = 3012;

// Serve static files from the "public" directory
app.use(express.static("public"));

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Handle form submission
app.post("/submit", async (req, res) => {
  const { ip, port: modbusPort, slaveId, address, value} = req.body;
  console.log(req.body)

  try {
    const client = new ModbusRTU();

    let registers = []

    for (let i = 0; i < address.length; i++) {
      registers.push({
        address: address[i],
        value: value[i]
      })
    }

    console.log(registers)

    // Open the TCP connection
    client.connectTCP(ip, { port: modbusPort }, () => {

      writeRegistersSequentially(registers, () => {
        // Close the connection after writing
        client.close(() => {
          console.log("Connection closed.");
        });
      });
    });

    function writeRegistersSequentially(registers, callback) {
      if (registers.length === 0) {
        callback();
        return;
      }

      const register = registers.shift();
      client.setID(slaveId); // Set the current slave ID
      client.writeRegisters(register.address, [register.value], (err) => {
        if (err) {
          console.error(`Error writing register ${register.address}:`, err);
        } else {
          console.log(`Register ${register.address} written successfully.`);
        }

        // Continue with the next register
        writeRegistersSequentially(registers, callback);
      });
    }
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
    client.setID(slaveId)
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
  // Handle the rejection here
});