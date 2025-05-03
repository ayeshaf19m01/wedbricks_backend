const express = require("express")
const router = express.Router()


//Test 

router.get('/', (req, res) => {
    res.send('Hello from the API! WedBricks')
})
 

module.exports  = router