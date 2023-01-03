let sha256 = require('sha256');
let moment = require('moment');
const fs = require('fs');
module.exports = function(app, db_ac) {

    /////////////////Functions/////////////////////
    async function is_logged_in(req, res, next) {
        if (!req.cookies.userID || !req.cookies.password) return res.redirect('/?error=true&message=Oturum açmadınız.');
        let ac = await db_ac.findOne({_id: req.cookies.userID});
        if (!ac) {
            res.clearCookie('userID');
            res.clearCookie('password');
            res.clearCookie('username');
            return res.redirect('/?error=true&message=Oturum açmadınız.');
        }
        if (ac.password != req.cookies.password) {
            res.clearCookie('userID');
            res.clearCookie('password');
            res.clearCookie('username');
            return res.redirect('/?error=true&message=Oturum açmadınız.');
        }
        next();
    }

    function log(text, type) {
        let msg = `[${moment().format('DD/MM/YYYY HH:mm:ss')}] ${text}`;
        console.log(msg);
        if (!fs.existsSync('./log')) {
            fs.mkdirSync('./log');
        }
        if (type == 'general') {
            fs.appendFile('./log/general.log', msg + '\n', function(err) {
                if (err) throw err;
            });
        } else if (type == 'error') {
            fs.appendFile('./log/error.log', msg + '\n', function(err) {
                if (err) throw err;
            });
        } else if (type == 'access') {
            fs.appendFile('./log/access.log', msg + '\n', function(err) {
                if (err) throw err;
            });
        } else if (type == 'profile') {
            fs.appendFile('./log/profile.log', msg + '\n', function(err) {
                if (err) throw err;
            });
        }
    }

    /////////////////Functions/////////////////////

    app.get('/', function(req, res) {
        if (req.cookies.userID && req.cookies.password && req.cookies.username) return res.redirect('/@' + req.cookies.username);
        res.render('index.ejs');
    });

    app.post('/signin', async function(req, res) {
        let {
            email,
            password
        } = req.body;
        if (!email || !password) return res.redirect('/?error=true&message=Mail veya şifre girilmedi.');
        let user = await db_ac.findOne({email: email});
        if (!user) return res.redirect('/?error=true&message=Kullanıcı bulunamadı.');
        if (user.password != sha256(password)) return res.redirect('/?error=true&message=Şifre yanlış.');
        res.cookie('userID', user._id, { maxAge: 900000, httpOnly: true });
        res.cookie('username', user.username, { maxAge: 900000, httpOnly: true });
        res.cookie('password', user.password, { maxAge: 900000, httpOnly: true });
        res.redirect('/@' + user.username);
    });

    app.post('/signup', async function(req, res) {
        let {
            username,
            email,
            password
        } = req.body;
        if (!username || !email || !password) return res.redirect('/?error=true&message=Kullanıcı adı, mail veya şifre girilmedi.');
        let user = await db_ac.findOne({username: username});
        if (user) return res.redirect('/?error=true&message=Kullanıcı adı kullanılıyor.');
        user = await db_ac.findOne({ email: email });
        if (user) return res.redirect('/?error=true&message=Mail kullanılıyor.');
        let newUser = new db_ac({
            username: username,
            password: sha256(password),
            email: email,
            profile_picture: 'https://cdn.discordapp.com/embed/avatars/0.png',
            social_media: [],
        });
        newUser.save();
        res.cookie('userID', newUser._id, { maxAge: 900000, httpOnly: true });
        res.cookie('username', newUser.username, { maxAge: 900000, httpOnly: true });
        res.cookie('password', newUser.password, { maxAge: 900000, httpOnly: true });
        res.redirect('/@' + username);
    });

    app.get('/@:username', async function(req, res) {
        let username = req.params.username;
        if (!username) return res.redirect('/?error=true&message=Kullanıcı adı girilmedi.');
        let user = await db_ac.findOne({username: username});
        if (!user) return res.redirect('/?error=true&message=Kullanıcı bulunamadı.');
        let social_media = [];
        for (let i = 0; i < user.social_media.length; i++) {
            let u = user.social_media[i];
            let class_name = i % 2 == 0 ? 'left' : 'right';
            let social = {
                name: u.name,
                link: u.link,
                class: class_name
            };
            social_media.push(social);
        }
        let u_profile = req.cookies?.username == username ? true : false;
        log(`@${username} profile page opened. Session: ${req.cookies?.username}, IP: ${req.ip}`, 'profile');
        res.render('profile.ejs', {
            user: user,
            social_media,
            u_profile
        });
    });

    app.get('/@:username/add', is_logged_in, async function(req, res) {
        let account = await db_ac.findOne({_id: req.cookies.userID});
        if (!account) return res.redirect(`/@:${req.params.username}?error=true&message=Kullanıcı bulunamadı.`);
        if (account.username != req.params.username) return res.redirect(`/@:${req.params.username}?error=true&message=Yetkiniz yok.`);
        res.render('edit.ejs', {
            user: account
        });
    });

    app.post('/@:username/add', is_logged_in, async function(req, res) {
        let account = await db_ac.findOne({_id: req.cookies.userID});
        if (!account) return res.redirect('/@'+req.params.username+'?error=true&message=Kullanıcı bulunamadı.');
        if (account.username != req.params.username) return res.redirect('/@'+req.params.username+'?error=true&message=Yetkiniz yok.');
        let username = req.params.username;
        if (!username) return res.redirect('/@'+req.params.username+'?error=true&message=Kullanıcı adı girilmedi.');
        let user = await db_ac.findOne({username: username});
        if (!user) return res.redirect('/@'+req.params.username+'?error=true&message=Kullanıcı bulunamadı.');
        let {
            name,
            link
        } = req.body;
        if (!name || !link) return res.redirect('/@'+req.params.username+'?error=true&message=Ad veya link girilmedi.');
        if(name.length > 20) return res.redirect('/@'+req.params.username+'?error=true&message=Ad 20 karakterden uzun olamaz.');
        if(link.length > 100) return res.redirect('/@'+req.params.username+'?error=true&message=Link 100 karakterden uzun olamaz.');
        if(user.social_media.length > 10) return res.redirect('/@'+req.params.username+'?error=true&message=10\'dan fazla sosyal medya hesabı ekleyemezsiniz.');
        let social = {
            name: name,
            link: link,
        };
        user.social_media.push(social);
        user.save();
        log(`@${username} added a social media account. Session: ${req.cookies?.username}, IP: ${req.ip}`, 'profile');
        res.redirect('/@' + username+'?success=true&message=Sosyal medya hesabı eklendi.');
    });
};