var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');

var userSchema = mongoose.Schema({
    // unique id is atomatically generated by mondo bd saved at _id

    username: String,
    password: String,
    description: String,
    email: String, // every user must have a unique email adress

    usertype: String, //superadmin or admin, or reguser
    joined_date: String,

    department: String, // computer science, medicine , pharmacy
    specialization: String, // biotechnology, human biology etc .. used for recomendation of labs

    image: String,
    labs: [String], // lab names the user is member of
    search_history: [String],
    last_login: {
        date: String,
        location: String,
        ip_addr: String,
        os: String,
        device: String
    },
    messages: [{
        from: String,
        message: String
    }]
});

userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(9));
}

userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
}

module.exports = mongoose.model('User', userSchema);
