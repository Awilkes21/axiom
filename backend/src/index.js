const express = require('express');
const app = express();

const PORT = process.env.PORT || 4000;

app.get('/', (req, res) => {
  res.send('Hello from Backend!');
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
