const express = require("express");
const ModbusRTU = require("modbus-serial");
const app = express();
const port = 3000;

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
  const { ip, port: modbusPort, unit, address, length } = req.body;
  console.log(req.body)

  const client = new ModbusRTU();

  try {
    // Open the connection to the FX5 PLC
    await client.connectTCP(ip, { port: modbusPort });

    // Read Holding Register (Function Code 0x03)
    const data = await client.readHoldingRegisters(unit, address, length);

    console.log("Read data:", data.data);
    res.status(200).json({ success: true, data: data.data });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.close();
  }
});
