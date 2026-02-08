const bcrypt = require('bcrypt');
const hash = bcrypt.hashSync('iso123', 12);
console.log(hash);

