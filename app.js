const express = require("express");
const ModbusRTU = require("modbus-serial");
const app = express();
const port = 3012;

app.use(express.static("public"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post("/submit", async (req, res) => {
  const { ip, port: modbusPort, slaveId, address, value } = req.body;
  
  try {
    const client = new ModbusRTU();
    await client.connectTCP(ip, { port: modbusPort });
    
    const resMessage = [];

    for (let i = 0; i < address.length; i++) {
      try {
        await client.writeRegisters(address[i], [value[i]]);
        resMessage.push(`Register ${address[i]} written successfully.`);
      } catch (err) {
        console.error(`Error writing register ${address[i]}:`, err);
      }
    }

    await client.close();

    res.json({ success: true, data: resMessage });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/submit_read", async (req, res) => {
  const { readIp, readModbusPort, readSlaveId, readAddress, readLength } = req.body;

  try {
    const client = new ModbusRTU();
    await client.connectTCP(readIp, { port: readModbusPort });

    client.readHoldingRegisters(readSlaveId, readAddress, readLength, (err, data) => {
      if (err) {
        console.error("Error reading holding registers:", err);
        res.status(500).json({ success: false, error: err.message });
      } else {
        console.log("Holding registers:", data.data);
        res.json({ success: true, data: data.data });
      }

      client.close(() => {
        console.log("Connection closed");
      });
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
