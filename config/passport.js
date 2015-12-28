var LocalStrategy = require('passport-local').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

var User = require('../app/models/user');
var configAuth = require('./auth');

module.exports = function(passport) {


    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            done(err, user);
        });
    });


    passport.use('local-signup', new LocalStrategy({
            usernameField: 'email',
            passwordField: 'password',
            passReqToCallback: true
        },
        function(req, email, password, done) {
            process.nextTick(function() {
                User.findOne({
                    'email': email
                }, function(err, user) {

                    if (err)
                        return done(err);
                    if (user)
                        return done(null, false, req.flash('signupMessage', 'Email is already taken'));
                    if (password != req.body.password2)
                        return done(null, false, req.flash('signupMessage', 'Passwords Don\'t Match'));
                    else {
                        var newUser = new User();
                        var date = new Date();

                        newUser.email = email;
                        newUser.password = newUser.generateHash(password);
                        newUser.username = req.body.username;
                        newUser.image = 'NO IMAGE';
                        newUser.joined_date = date.getFullYear() + "/" + (date.getMonth() + 1) + "/" + date.getDate();
                        newUser.department = req.body.department;
                        newUser.specialization = req.body.specialization;
                        newUser.labs = [];

                        // assign user privileges and save to database
                        User.count(function(err, count) {
                            if (!err && count === 0) {
                                newUser.usertype = 'superadmin'; //very first user is a super admin

                                // save to the databse
                                newUser.save(function(err) {
                                    if (err)
                                        throw err;
                                    return done(null, newUser);
                                })
                            } else {
                                newUser.usertype = 'reguser'; // otherwise a regular user

                                // save to the database
                                newUser.save(function(err) {
                                    if (err)
                                        throw err;
                                    return done(null, newUser);
                                })
                            }
                        });

                    }
                })

            });
        }));

    passport.use('local-login', new LocalStrategy({
            usernameField: 'email',
            passwordField: 'password',
            passReqToCallback: true
        },
        function(req, email, password, done) {
            process.nextTick(function() {
                User.findOne({
                    'email': email
                }, function(err, user) {
                    if (err)
                        return done(err);
                    if (!user)
                        return done(null, false, req.flash('loginMessage', 'No User found'));
                    if (!user.validPassword(password)) {
                        return done(null, false, req.flash('loginMessage', 'Invalid password'));
                    }
                    return done(null, user);
                });
            });
        }
    ));

    passport.use(new GoogleStrategy({
            clientID: configAuth.googleAuth.clientID,
            clientSecret: configAuth.googleAuth.clientSecret,
            callbackURL: configAuth.googleAuth.callbackURL
        },
        function(accessToken, refreshToken, profile, done) {
            process.nextTick(function() {
                User.findOne({
                    'email': profile.emails[0].value
                }, function(err, user) {
                    if (err)
                        return done(err);
                    if (user)
                        return done(null, user);
                    else {
                        var newUser = new User();
                        var date = new Date();

                        newUser.username = profile.displayName;
                        newUser.image = 'NO IMAGE';
                        newUser.email = profile.emails[0].value;
                        newUser.joined_date = date.getFullYear() + "/" + (date.getMonth() + 1) + "/" + date.getDate();
                        newUser.labs = [];
                        // assign user privileges and save to database
                        User.count(function(err, count) {
                            if (!err && count === 0) {
                                newUser.usertype = 'superadmin'; //very first user is a super admin

                                // save to the databse
                                newUser.save(function(err) {
                                    if (err)
                                        throw err;
                                    return done(null, newUser);
                                })
                            } else {
                                newUser.usertype = 'reguser'; // otherwise a regular user

                                // save to the database
                                newUser.save(function(err) {
                                    if (err)
                                        throw err;
                                    return done(null, newUser);
                                })
                            }
                        });

                        console.log(profile);
                    }
                });
            });
        }
    ));

};
