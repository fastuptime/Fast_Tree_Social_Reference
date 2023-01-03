const mongoose = require('mongoose');
const moment = require('moment');
let db = mongoose.createConnection('mongodb://localhost:27017/test', {useNewUrlParser: true, useUnifiedTopology: true});

let User = new mongoose.Schema({
    username: String,
    password: String,
    email: String,
    profile_picture: String,
    social_media: [
        {
            name: String,
            link: String,
            created: {
                type: String,
                default: moment().format('DD/MM/YYYY HH:mm:ss')
            },
        }
    ],
    created: {
        type: String,
        default: moment().format('DD/MM/YYYY HH:mm:ss')
    },
    updated: {
        type: String,
        default: moment().format('DD/MM/YYYY HH:mm:ss')
    },
});

let UserModel = db.model('User', User);

User.pre('save', function(next) {
    this.updated = moment().format('DD/MM/YYYY HH:mm:ss');
    next();
});

module.exports = UserModel;