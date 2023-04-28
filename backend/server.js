const path = require('path')

// REST API functionality
const { app } = require(path.resolve(__dirname, 'api', 'api'))

// server monitoring functionality
const { scanner } = require('./scanner/scanner')

// starting http server
const port = process.env.JASMA_backend_port
app.listen(port, () => {
  console.log(`API server is listening on port ${port}`)
})
