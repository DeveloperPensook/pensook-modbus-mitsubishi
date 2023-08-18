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
  const { ip, port: modbusPort, slaveId, address, value } = req.body;
  const client = new ModbusRTU();

  try {
    	// Open the connection to the FX5 PLC
	await client.connectTCP(ip, { port: modbusPort});
	client.setID(slaveId)
	console.log("connect successfully")

	// Write Holding Register
	await client.writeRegisters(address, value, function(err, data) {
		console.log("write register successfully")
		console.log(data)
	});
	
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.close();
  }
});
