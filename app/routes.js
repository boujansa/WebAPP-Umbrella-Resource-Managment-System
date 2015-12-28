var User = require('./models/user');
var Lab = require('./models/labs');
var busboy = require('connect-busboy');
var fs = require('fs');
//======================================================================
/*GLOBAL VARIABLES:
 */
var numBookingSlots = 5;
var numBookingDays = 4;
const BAD_REQUEST_RESPONSE_CODE = 400;
//User.remove({}, function(){});
//Lab.remove({}, function(){});
//======================================================================

module.exports = function(app, passport) {

    app.get('/', function(req, res) {
        if (req.isAuthenticated()) {
            res.redirect('/profile');
        }
        res.render('index.ejs');
    });

    /*-------------------------------------------------------------------
    Log in and Sign up routes
    ---------------------------------------------------------------------*/

    app.get('/login', function(req, res) {
        if (req.isAuthenticated()) {
            res.redirect('/profile');
        }
        console.log("wants to login");
        res.render('login.ejs', {
            message: req.flash('loginMessage')
        });
    });

    app.post('/login', passport.authenticate('local-login', {
        successRedirect: '/profile',
        failureRedirect: '/login',
        failureFlash: true
    }));

    app.get('/signup', function(req, res) {
        if (req.isAuthenticated()) {
            res.redirect('/profile');
        }
        res.render('signup.ejs', {
            message: req.flash('signupMessage')
        });
    });


    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect: '/profile',
        failureRedirect: '/signup',
        failureFlash: true
    }));

    // in our app admin panel is the same as main profile page
    app.get('/admin', isLoggedIn, function(req, res) {
        res.redirect('/profile');
    });

    // use this as a example when adding more routes , you must check isLoggedIn
    app.get('/profile', isLoggedIn, function(req, res) {
        console.log(JSON.stringify(req.user));

        var recomandlabCount = 0;
        var recoLabs = [];
        var usedLab = [];
        var recLab = {};

        Lab.find({}, function(err, lab) {

            for (var i = 0; i < lab.length; i++) {
                if (lab[i].admin_approve == 'true' && lab[i].department == req.user.department && lab[i].specialization == req.user.specialization && recomandlabCount < 5) {

                    recLab = {
                        id: lab[i]._id,
                        labname: lab[i].labname,
                        department: lab[i].department,
                        specialization: lab[i].specialization
                    }

                    if (usedLab.indexOf(String(lab[i]._id)) <= -1) {
                        usedLab.push(String(lab[i]._id));
                        recoLabs.push(recLab);
                        recomandlabCount += 1;
                    }

                }
            }


            Lab.find({}, function(err, lab) {
                for (var i = 0; i < lab.length; i++) {
                    if (lab[i].admin_approve == 'true' && lab[i].specialization == req.user.specialization && recomandlabCount < 5) {
                        recLab = {
                            id: lab[i]._id,
                            labname: lab[i].labname,
                            department: lab[i].department,
                            specialization: lab[i].specialization
                        }

                        if (usedLab.indexOf(String(lab[i]._id)) <= -1) {
                            usedLab.push(String(lab[i]._id));
                            recoLabs.push(recLab);
                            recomandlabCount += 1;
                        }
                    }
                }


                Lab.find({}, function(err, lab) {

                    for (var i = 0; i < lab.length; i++) {

                        if (lab[i].admin_approve == 'true' && lab[i].department == req.user.department && recomandlabCount < 5) {
                            recLab = {
                                id: lab[i]._id,
                                labname: lab[i].labname,
                                department: lab[i].department,
                                specialization: lab[i].specialization
                            }

                            if (usedLab.indexOf(String(lab[i]._id)) <= -1) {
                                usedLab.push(String(lab[i]._id));
                                recoLabs.push(recLab);
                                recomandlabCount += 1;
                            }
                        }
                    }

                    Lab.find({}, function(err, lab) {

                        for (var i = 0; i < lab.length; i++) {

                            if (lab[i].admin_approve == 'true' && recomandlabCount < 5) {
                                recLab = {
                                    id: lab[i]._id,
                                    labname: lab[i].labname,
                                    department: lab[i].department,
                                    specialization: lab[i].specialization
                                }
                                if (usedLab.indexOf(String(lab[i]._id)) <= -1) {
                                    usedLab.push(String(lab[i]._id));
                                    recoLabs.push(recLab);
                                    recomandlabCount += 1;
                                }
                            }
                        }
                        res.render('welcome.ejs', {
                            user: req.user,
                            recommandLabs: recoLabs,
                            message: req.query.message
                        });
                    });
                });
            });
        });
    });
    /*-------------------------------------------------------------------
    Google Authentication routes
    ---------------------------------------------------------------------*/
    app.get('/auth/google', passport.authenticate('google', {
        scope: ['profile', 'email']
    }));

    app.get('/auth/google/callback',
        passport.authenticate('google', {
            successRedirect: '/profile',
            failureRedirect: '/'
        }));

    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });

    /*-------------------------------------------------------------------
    Lab routes
    ---------------------------------------------------------------------*/
    //====================
    //Create New Lab
    //====================
    app.get('/createLab', isLoggedIn, function(req, res) {
        console.log("Creating lab by: " + req.user.email);
        res.render('createLab.ejs', {
            email: req.user.email,
            message: null
        });
    });

    app.post('/createLab', isLoggedIn, checkIfLabNameTaken, addLab, function(req, res) {
        if (res.labs == null) {
            console.log("Missing Fields!!");
            res.render('createLab.ejs', {
                email: req.user.email,
                message: res.message
            });
        } else {
            console.log("Created Lab for: " + req.user.email);
            res.redirect('/profile' + '?message=' + 'Successfully Created New Lab');
        }
    });

    //===================
    //List All Labs
    //===================
    app.get('/listLabs', isLoggedIn, getAllLabs, function(req, res) {
        res.render('listLabs.ejs', {
            searchOne: false,
            labs: res.labs,
            user: req.user,
            message: req.query.message
        });
    });

    //===================
    //List All Users
    //===================
    app.get('/listUsers', isLoggedIn, getAllUsers, function(req, res) {
        console.log("Lisint all users in the system");
        var userInfo = [];
        var autoJump = req.param('auto');
        var jumpTo = -1;
        var targetId = -1;
        for (var i = 0; i < res.users.length; i++) {
            if (autoJump == 'true' && req.user.email == res.users[i].email) {
                jumpTo = i;
            }
            if (req.user.email == res.users[i].email) {
                targetId = i;
            }
            userInfo.push({
                username: res.users[i].username,
                email: res.users[i].email,
                usertype: res.users[i].usertype,
                description: res.users[i].description,
                department: res.users[i].department,
                specialization: res.users[i].specialization,
                image: res.users[i].image
            })
        }
        res.render('listUsers.ejs', {
            targetUser: jumpTo,
            users: userInfo,
            userId: targetId,
            userType: req.user.usertype,
            message: null
        });
    });

    //=============================
    //List All Users in a given Lab
    //=============================
    app.get('/listUsersInLab', isLoggedIn, getAllUsers, function(req, res) {
        var labId = req.param('labId');
        var userInfo = [];
        var targetId = -1;
        Lab.findById(labId, function(err, targetLab) {
            console.log(targetLab);
            for (var r = 0; r < targetLab.members.length; r++) {
                for (var i = 0; i < res.users.length; i++) {
                    var user = res.users[i];
                    console.log("find this user's id " + 　user._id);
                    if (req.user.email == res.users[i].email) {
                        targetId = i;
                    }
                    if (targetLab.members[r].email == user.email) {
                        console.log("user " + 　user);
                        userInfo.push({
                            username: user.username,
                            email: user.email,
                            usertype: user.usertype,
                            description: user.description,
                            image: user.image
                        });
                    }
                }
            }
            console.log("CHECK CHECK : " + userInfo);
            res.render('listUsers.ejs', {
                targetUser: -1,
                users: userInfo,
                userId: targetId,
                userType: req.user.usertype,
                message: null
            });
        });
    });

    app.use(busboy());

    //===================
    //Upload User Image
    //===================
    app.route('/uploadPic').post(function(req, res) {
        var fstream;
        var userEmail;
        console.log("Step 1");
        req.pipe(req.busboy);
        req.busboy.on('field', function(fieldname, val, fieldnameTruncated,
            valTruncated) {
            console.log("Step 2");
            if (fieldname == 'email') {
                userEmail = val;
            }
        });
        req.busboy.on('file', function(fieldname, file, filename) {
            console.log("Step 3");
            console.log("Uploading: " + filename);
            newFileStorage = __dirname + '\\..\\data\\profilePic\\temp.png'
            fstream = fs.createWriteStream(newFileStorage);
            file.pipe(fstream);
            fstream.on('close', function() {
                moveFile(userEmail);
            });
            req.busboy.on('finish', function() {
                res.redirect(req.get('referer'));
            });
        });
    });

    function moveFile(userEmail) {
        console.log("Move file, user email is " + userEmail);
        User.findOne({
            email: userEmail
        }, function(err, user) {
            console.log(user);
            oldFileStorage = __dirname + '\\..\\data\\profilePic\\temp.png'
            newFileStorage = __dirname + '\\..\\data\\profilePic\\' + user["_id"] +
                '.png'
            fs.rename(oldFileStorage, newFileStorage, function(err) {});
            //Path where image will be uploaded
            User.update({
                email: userEmail
            }, {
                image: '../data/profilePic/' + user["_id"] +
                    '.png'
            }, function(err) {});
        });
    }

    //===================
    //Update profile
    //===================
    app.get('/updateProfile', function(req, res) {
        var userEmail = req.param('email');
        var userName = req.param('username');
        var userDescription = req.param('description');
        var userDepart = req.param('department');
        var userSpecial = req.param('specialization');
        User.update({
            email: userEmail
        }, {
            username: userName,
            description: userDescription,
            department: userDepart,
            specialization: userSpecial
        }, function(err) {});
        res.end();
    });

    //===================
    //Update password
    //===================
    app.get('/updatePassword', function(req, res) {
        var userEmail = req.param('email');
        var oldPass = req.param('oldPass');
        var newPass = req.param('newPass');
        var userDescription = req.param('description');
        User.findOne({
            email: userEmail
        }, function(err, user) {
            console.log(user.password);
            if (user.validPassword(oldPass)) {
                User.update({
                    password: user.generateHash(newPass)
                }, function(err) {});
            } else {
                res.status(404).send('Old password is invalid');
            }
            res.end();
        });
    });


    //=========================
     //Search for a Specific Lab
     //=========================
    app.get('/searchThisLab', isLoggedIn, getThisLab,  function(req, res) {
        req.session.lab = res.labs;
        console.log("Search a lab for by: " + req.user.email);
        console.log("Found this lab: " + res.labs.labname);

        res.render('listLabs.ejs', {
            searchOne: true,
            labs: res.labs,
            user: req.user,
            message: req.query.message
        });
    });

    //=========================
    //List a Specific Lab
    //=========================
    app.get('/listThisLab', isLoggedIn, getThisLab, /*isLabMember,*/ function(req, res) {
        if (res.labs == null || res.isMember == false) {
            req.session.lab = null;
            res.redirect('/profile' + '?message=' + 'You must be a lab member to view lab!');
        } else {
            req.session.lab = res.labs;
            console.log("Search a lab for by: " + req.user.email);
            console.log("Found this lab: " + res.labs.labname);
            res.render('labPage.ejs', {
                lab: res.labs,
                user: req.user,
                message: req.query.message
            });
        }
    });

    /*-------------------------------------------------------------------
    Joining and Removing users from lab
    ---------------------------------------------------------------------*/
    //==========================
    //Send Request to join a lab
    //==========================
    app.post('/joinThisLab', isLoggedIn, sendJoinRequest, function(req, res) {
        console.log("Request From: " + req.user.username);
        console.log("To join: " + req.query.labname);
    });

    //=========================
    //List Lab members to Admin // NOTE: this is different from viewing lab profiles
    //=========================
    app.get('/listLabMembers', isLoggedIn, fetchThisLab, function(req, res) {
        console.log("Listing Lab Members for: " + req.user.email);
        res.render('listLabMembers.ejs', {
            lab: req.session.lab,
            message: null
        });
    });

    //================================
    //Approve new Lab members by Admin
    //================================
    app.get('/approveThisUser', isLoggedIn, approveJoinRequest, function(req, res) {
        console.log("Listing Lab Members for: " + req.user.email);
    });

    //================================
    //Remove a member from lab
    //================================
    app.get('/removeThisUser', isLoggedIn, removeUserFromLab, function(req, res) {
        console.log("Listing Lab Members for: " + req.user.email);
    });

    //================================
    //Remove a member from the system
    //For now only regular users can be removed
    //================================
    app.post('/removeThisUserFromSystem', isLoggedIn, removeUserFromSystem, function(req, res) {
        console.log("Remove this guy: " + req.body.email + " requested by " + req.user.email);
        res.redirect('/listUsers');
    });

    //================================
    //Approve new Lab  by SuperAdmin
    //================================
    app.get('/approveThisLab', isLoggedIn, function(req, res) {
        console.log("Approve this Lab " + req.query.specificLab);
        Lab.findOneAndUpdate({
            labname: req.query.specificLab
        }, {
            admin_approve: true
        }, function(err, lab) {
            if (err) {
                throw err;
            }
            // since super admin approved the lab , promote the user who created the lab to an admin
            console.log("lab returned" + lab);
            User.findOne({
                email: lab.admin_email
            }, function(err, user) {
                if (err) {
                    throw err;
                } else {
                    console.log("user returned" + user);

                    if (user.usertype == 'reguser') {

                        User.update({
                            email: user.email
                        }, {
                            usertype: 'admin'
                        }, function(err) {
                            if (err) {
                                console.log(err);
                                return res.send(err);
                            }
                        });
                    }
                }
            });
        });
        res.redirect('/listLabs' + '?message=' + 'Approved the Lab Successfully!');
    });

    /*-------------------------------------------------------------------
    Messaging routes
    ---------------------------------------------------------------------*/
    //====================
    //Post Private Message
    //====================
    app.post('/sendMessage', isLoggedIn, saveMessage, function(req, res) {});

    //=====================
    //View Private Messages
    //=====================
    app.get('/listMessages', isLoggedIn, function(req, res) {
        console.log("Listing Messages for: " + req.user.email);
        res.render('listMessages.ejs', {
            user: req.user,
            message: req.query.message
        });
    });

    //========================
    //Delete Private Messages
    //========================
    app.get('/deleteThisMessage', isLoggedIn, deleteMessage, function(req, res) {
        console.log("Listing Messages for: " + req.user.email);
    });

    //========================
    //Reply to Private Message
    //========================
    app.post('/replyThisMessage', isLoggedIn, replyMessage, function(req, res) {
        console.log("Replying Messages for: " + req.user.email);
    });


    //====================
    //Post Lab rating
    //====================
    app.post('/postLabRating', isLoggedIn, fetchThisLab, isLabMember, postLabRating, function(req, res) {
        console.log("Lab rating From: " + req.user.username);
        console.log("Rating = " + req.body.rating);
        console.log("Rating for lab = " + req.session.lab.labname)
    });

    // =============================================
    // Get lab ratings based on specificLab=<labname>
    // ==============================================
    app.get('/getLabRatings', isLoggedIn, getThisLab, function(req, res) {
        if (res.labs == null) {
            res.redirect('/listThisLab?specificLab=' + req.session.lab.labname + '&message=' + 'Unsuccessful!');
        } else {
            console.log("Returning " + res.labs.labname + "'s ratings list.");
            console.log("labname: " + res.labs.labname);
            console.log("ratings: " + res.labs.ratings);
            res.json(res.labs.ratings);
        }
    });


    // ==============================
    // Get OVERALL LAB RATING based on specificLab=<labname>
    // ==============================
    app.get('/getLabRating', isLoggedIn, getThisLab, function(req, res) {
        if (res.labs == null) {
            res.redirect('/listThisLab?specificLab=' + req.session.lab.labname + '&message=' + 'Unsuccessful!');
        } else {
            var sum = 0;
            var count = 0;
            var avg_rating = 0;

            res.labs.ratings.forEach(function(rating) {
                sum += parseInt(rating.rating);
                count += 1;
                console.log(rating + "; sum = " + sum + "; count = " + count);
            });

            if (count <= 0) {
                avg_rating = 0;
            } else {
                avg_rating = sum / count;
            }

            res.json([{
                "lab_name": res.labs.labname,
                "number_of_ratings": count,
                "overall_rating": avg_rating
            }]);
        }
    });

    //====================
    //Post Equipment rating
    //====================
    app.post('/postEquipmentRating', isLoggedIn, fetchThisLab, isLabMember, postEquipmentRating, function(req, res) {
        console.log("Equipment rating From: " + req.user.username);
        console.log("Rating = " + req.body.equip_rating);
        console.log("Rating for lab = " + req.session.lab.labname);
        console.log("Rating for equipment = " + req.body.equip_id);
    });


    //====================
    //Post equipment comment
    //====================
    app.post('/postEquipmentComment', isLoggedIn, fetchThisLab, isLabMember, postEquipmentComment, function(req, res) {
        console.log("Equipment comment from: " + req.user.username);
        console.log("Comment = " + req.body.equip_comment);
        console.log("Rating for lab = " + req.session.lab.labname);
        console.log("Rating for equipment = " + req.body.equip_id);
    });


    // ==============================
    // Get all lab equipment ratings based on specificLab
    // ==============================
    app.get('/getEquipmentRatings', isLoggedIn, getThisLab, function(req, res) {
        if (res.labs == null) {
            res.redirect('/listThisLab?specificLab=' + req.session.lab.labname + '&message=' + 'Unsuccessful!');
        } else {
            var res_json = [];

            res.labs.equipment.forEach(function(equipment) {
                var sum = 0;
                var count = 0;
                var avg_rating = 0;

                equipment.ratings.forEach(function(equip_rating) {
                    sum += parseInt(equip_rating.rating);
                    count += 1;
                });

                console.log(equipment.name + "'s ratings ===== sum = " + sum + "; count = " + count);

                if (count <= 0)
                    avg_rating = 0;
                else
                    avg_rating = sum / count;

                res_json.push({
                    id: equipment.id,
                    name: equipment.name,
                    number_of_ratings: count,
                    overall_rating: avg_rating
                });
            });

            res.json(res_json);
        }
    });

    //====================
    //Post Lab Comment
    //====================
    app.post('/postComment', isLoggedIn, fetchThisLab, isLabMember, postComment, function(req, res) {
        console.log("Lab comment From: " + req.user.username);
        console.log("Comment about lab = " + req.session.lab.labname);
        console.log("Lab Comment: " + req.body.comment);
    });

    // ==============================
    // Get lab comments based on specificLab=<labname>
    // ==============================
    app.get('/getLabComments', isLoggedIn, getThisLab, function(req, res) {
        if (res.labs == null) {
            res.redirect('/listThisLab?specificLab=' + req.session.lab.labname + '&message=' + 'Unsuccessful!');
        } else {
            console.log("Returning " + res.labs.labname + "'s comment list.");
            console.log("labname: " + res.labs.labname);
            console.log("comments: " + res.labs.comments);
            res.json(res.labs.comments);
        }
    });

    /*-------------------------------------------------------------------
    Equipment routes
    ---------------------------------------------------------------------*/
    // ==============================
    // Get all items from a lab.
    // ==============================
    app.get('/getLabEquipment', isLoggedIn, getThisLab, function(req, res) {
        if (res.labs == null) {
            res.redirect('/profile');
        } else {
            console.log("Returning " + res.labs.labname + "'s equipment list.");
            console.log("labname: " + res.labs.labname);
            console.log("equipment: " + res.labs.equipment);
            res.json(res.labs.equipment);
        }
    });

    // ================================
    // Show the addEquipment page...
    // ================================
    app.get('/addEquipment', isLoggedIn, fetchThisLab, isLabMember, function(req, res) {
        if ((req && req.user && req.user.usertype != "superadmin") && (res && !res.isAdmin)) {
            // Through the UI alone, the user should never reach this point
            // Which means, the user was trying hard to hack the lab's rating.
            console.log("Only lab admins can add new equipment to the lab!");
            res.redirect('/listThisLab?specificLab=' + req.session.lab.labname + "&message=" + "Only lab admins can add new equipment to the lab!");
        } else {
            console.log("Showed addEquipment.ejs to: " + req.user.email + " of usertype = " + req.user.usertype);
            res.render('addEquipment.ejs', {
                email: req.user.email
            });
        }
    });

    // ================================
    // Add an item to a lab.
    // ================================
    app.post('/addEquipment', isLoggedIn, fetchThisLab, isLabMember, addEquipment, function(req, res) {
        console.log("Adding NEW equipment to lab. Equip Name = " + req.param.name + ". Lab = " + req.session.lab.labname);

    });

    //====================================================
    //Get the table which allows user to book an equipment
    //====================================================
    app.get('/getBookingTable/:equipmentNum', isLoggedIn, fetchThisLab, isLabMember, manageBooking, function(req, res) {
        req.session.equipmentNum = req.params.equipmentNum;
        res.render('bookingPage.ejs', {
            booking: res.booking,
            lab: req.session.lab,
            email: req.user.email,
            equipNum: req.params.equipmentNum,
            numBookingSlots: req.session.lab.equipment[req.session.equipmentNum].numBookingSlots,
            numBookingDays: req.session.lab.equipment[req.session.equipmentNum].numBookingDays
        });
    });

    //====================================================
    //Remove this equipment
    //====================================================
    app.get('/removeThisEquip/:equipmentNum', isLoggedIn, fetchThisLab, isLabMember, removeEquip, function(req, res) {

        res.redirect('/listThisLab?specificLab=' + req.session.lab.labname + '&message=' + req.message);
        req.session.equipmentNum = req.params.equipmentNum;
    });


    //====================================================
    //Book the specific slot for the equipment
    //====================================================
    app.get('/bookThisEquip/:day/:slot', isLoggedIn, fetchThisLab, isLabMember, bookThisEquip, function(req, res) {
        //console.log("Booking: Equip Number = " + req.session.equipmentNum + " Day num: " + req.params.day +" slot number = " + req.params.slot);
        res.redirect('/listThisLab?specificLab=' + req.session.lab.labname + '&message=' + 'Successfuly booked Item !');

    });
};

//Book equipment: all info has been passed in or is in session based on the flow
function bookThisEquip(req, res, next) {
    console.log("Booking Func: Equip Number = " + req.session.equipmentNum + " Day num: " + req.params.day + " slot number = " + req.params.slot);
    var lab = req.session.lab;
    if (!res.isMember) {
        console.log("SECURITY THREAT DETECTED..NOT a member of lab trying to book equip");
        return next();
    } else if (lab == null) {
        console.log("PROBLEM-----------Lab DNE");
        res.lab = null;
        return next();
    } else {
        console.log("foudn this: " + lab.labname);
        var equip = lab.equipment[req.session.equipmentNum];
        var booking = lab.equipment[req.session.equipmentNum].booking;
        var numBookingDays = lab.equipment[req.session.equipmentNum].numBookingDays;
        var numBookingSlots = lab.equipment[req.session.equipmentNum].numBookingSlots;
        //=====================================================CASE 1 ======================================================
        //If this equipment has never been booked/initialized, we will create everything from scratch
        if (booking.length == 0) {
            var date = new Date();
            console.log("Never booked before ... creating the booking structure");
            for (var i = 0; i < numBookingDays; i++) {
                console.log("Adding for day: " + i);
                booking.push({
                    dateY: date.getFullYear(),
                    dateM: date.getMonth() + 1,
                    dateD: date.getDate() + i,
                    slot: []
                });
                for (var j = 0; j < numBookingSlots; j++) {
                    if (i == req.params.day && j == req.params.slot) {
                        console.log("BOOKing this: day " + i + " spot: " + j);
                        if (equip.quantity > 1) {
                            console.log("   More left");
                            booking[i].slot.push({
                                booked: false,
                                bookedBy: req.user.email,
                                quantityLeft: equip.quantity - 1
                            });
                        }
                        //There must be only one equipment
                        else {
                            console.log("   Only one");
                            booking[i].slot.push({
                                booked: true,
                                bookedBy: req.user.email,
                                quantityLeft: 0
                            });
                        }
                    } else {
                        console.log("Not Matched--Free " + j)
                        booking[i].slot.push({
                            booked: false,
                            bookedBy: null,
                            quantityLeft: equip.quantity
                        });
                    }
                }
            }
        }
        //====================================================CASE 1==============================================
        //The structure has been set alraedy
        //All we have to do is set the correct spot as booked
        else {
            console.log("Booking structure been set before");

            if (booking[req.params.day].slot[req.params.slot].quantityLeft > 1) {
                console.log("There are more than one equip left .. will still be available");
                booking[req.params.day].slot[req.params.slot].booked = false;
                booking[req.params.day].slot[req.params.slot].bookedBy = req.user.email;
                booking[req.params.day].slot[req.params.slot].quantityLeft -= 1
            }
            //There must only be one equipemt left and it will be booked now
            else {
                console.log("This is the last one. Book it and there wont be any left");
                booking[req.params.day].slot[req.params.slot].booked = true;
                booking[req.params.day].slot[req.params.slot].bookedBy = req.user.email;
                booking[req.params.day].slot[req.params.slot].quantityLeft = 0;
            }
        }
        //=============================================UPDATE DB==================================================
        lab.equipment[req.session.equipmentNum].booking = booking;
        console.log("Saving booking updates");
        lab.save(function(err) {
            if (err)
                throw err;
        });
        console.log("Done");
        return next();
    }
};

//Shift and Update the days/slots as we have moved to a new day
function updateNewToday(booking, todayIndex, numBookingDays, numBookingSlots) {
    console.log("We have a new today. Index = " + todayIndex);
    var i = 0;
    //shift corresponds to how many shifts we have to perform
    var shift = numBookingDays - todayIndex;
    while (i < shift) {
        booking[i].dateY = booking[todayIndex + i].dateY;
        booking[i].dateM = booking[todayIndex + i].dateM;
        booking[i].dateD = booking[todayIndex + i].dateD;
        for (var j = 0; j < numBookingSlots; j++) {
            booking[i].slot[j].booked = booking[todayIndex + i].slot[j].booked;
            booking[i].slot[j].bookedBy = booking[todayIndex + i].slot[j].bookedBy;
            booking[i].slot[j].quantityLeft = booking[todayIndex + i].slot[j].quantityLeft;
        }
        i++;
    }
}
//Set all slots to available
function refreshBooking(booking, numBookingDays, numBookingSlots, equip) {
    var date = new Date();
    console.log("All booking expired...Refreshing");
    for (var i = 0; i < numBookingDays; i++) {
        booking[i].dateY = date.getFullYear();
        booking[i].dateM = date.getMonth() + 1;
        booking[i].dateD = date.getDate() + i;
        for (var j = 0; j < numBookingSlots; j++) {
            booking[i].slot[j].booked = false;
            booking[i].slot[j].bookedBy = null;
            booking[i].slot[j].quantityLeft = equip.quantity;
        }
    }
}
//Search through the booking array and find out which index corresponds to today, if any
function getTodayIndex(booking, numBookingDays, numBookingSlots, equip) {
    var date = new Date();
    for (var i = 0; i < numBookingDays; i++) {
        if (booking[i].dateY == date.getFullYear() && (booking[i].dateM == date.getMonth() + 1) && booking[i].dateD == date.getDate()) {
            if (i != 0) {
                updateNewToday(booking, i, numBookingDays, numBookingSlots);
                for (var k = numBookingDays - i; k < numBookingDays; k++) {
                    booking[i].dateY = date.getFullYear();
                    booking[i].dateM = date.getMonth() + 1;
                    booking[i].dateD = date.getDate() + k;
                    for (var j = 0; j < numBookingSlots; j++) {
                        booking[k].slot[j].booked = false;
                        booking[k].slot[j].bookedBy = null;
                        booking[i].slot[j].quantityLeft = equip.quantity;
                    }
                }
            }
            return i;
        }
    }
    return -1;
}

//Checks if current user trying to book the lab is actually a member of this lab
function isLabMember(req, res, next) {
    var lab = req.session.lab;
    var labAdmin = req.session.lab.admin_email;
    var labname = req.session.lab.labname;
    var email = req.user.email;
    var members = req.session.lab.members;
    //Super admins and lab admins can do whatever
    if (req.user.usertype == "superadmin" || (email == labAdmin && lab.admin_approve == "true")) {
        res.isMember = true;
        if (email == labAdmin && lab.admin_approve == "true") { // return admin status too
            res.isAdmin = true;
        }
        return next();
    } else {
        for (var i = 0; i < members.length; i++) {
            if (email == members[i].email) {
                res.isMember = true;
                return next();
            }
        }
        console.log("DETECTED ===> NOT LAB MEMBER");
        res.isMember = false;
        res.isAdmin = false;
        return next();
    }
}

function removeEquip(req, res, next) {
    if (req.user.usertype == "superadmin") {
        console.log("Admin here");
    } else if (req.session.lab.admin_email != req.user.email) {
        req.message = "Only Lab Admin can remove Equipments";
        return next();
    }
    var equip = req.session.lab.equipment;
    equip[req.params.equipmentNum] = null;
    Lab.findOneAndUpdate({
            labname: req.session.lab.labname,
        }, {
            "$set": { // UPDATE EXISTING RATING
                equipment: equip
            }
        },
        function(err, lab) {
            if (err) {
                throw err;
            }
            req.session.lab = lab;
            req.message = "Successfully removed equipment";
            return next();
        });
}

//Manage the booking of the equipment
//Based on which slot user chose, we mark it as booked
function manageBooking(req, res, next) {
    var dirty = 0;
    var equip = req.session.lab.equipment;
    var booking = req.session.lab.equipment[req.params.equipmentNum].booking;
    var date = new Date();
    console.log("Display Booking table for: " + req.session.lab.labname + " equipment number: " + req.params.equipmentNum);
    //if there are no current booking
    if (!res.isMember) {
        console.log("SECURITY THREAT DETECTED..NOT a member of lab trying to GET BOOKING TABLE");
        return next();
    } else if (booking.length == 0) {
        console.log("booking is empty");
        res.booking = null;
        return next();
    }
    //This item has been booked
    else {
        console.log("Booking has been set before ... ****PERFORMING UPDATES FIRST****");

        var numBookingDays = req.session.lab.equipment[req.params.equipmentNum].numBookingDays;
        var numBookingSlots = req.session.lab.equipment[req.params.equipmentNum].numBookingSlots;

        //check if the booking has expired
        var todayIndex = getTodayIndex(booking, numBookingDays, numBookingSlots, equip);
        console.log("Today's index is: " + todayIndex);
        //All Booking expired, refresh everything
        if (todayIndex == -1) {
            refreshBooking(booking, numBookingDays, numBookingSlots, equip);
            dirty = 1;
        }
        //We have a new today, shift everything
        else if (todayIndex != 0) {
            dirty = 1;
        }
        //Returned Data
        res.booking = booking;
        equip[req.params.equipmentNum].booking = booking;
        //Check if we need to update the database
        if (dirty == 1) {
            console.log("Updates were made, updating the database ...");
            Lab.update({
                labname: req.session.lab.labname
            }, {
                equipment: equip
            }, function(err) {
                if (err)
                    throw err;
                return next();
            });
        } else {
            return next();
        }
    }
}

//Add new Item to a lab
function addEquipment(req, res, next) {
    if ((req && req.user && req.user.usertype != "superadmin") && (res && !res.isAdmin)) {
        // Through the UI alone, the user should never reach this point
        // Which means, the user was trying hard to hack the lab's rating.
        console.log("You are NOT a member of lab trying to comment on!");
        res.redirect('/listThisLab?specificLab=' + req.session.lab.labname + "&message=" + "If you are reading this, please report this instance to the superadmin.");
    } else if (req && req.session && req.user && req.session.lab &&
        req.session.lab.labname && (req.user.username == req.session.lab.admin_name || req.user.usertype == 'superadmin')) {

        var equip_details = { // Create an obj of what needs to be added to the db...
            name: req.body.name, //+ suffix,
            quantity: req.body.quantity,
            notes: req.body.notes,
            hidden: req.body.hidden,
            numBookingSlots: req.body.numBookingSlots,
            numBookingDays: req.body.numBookingDays,
            booking: [],
            ratings: [],
            number_of_ratings: 0,
            overall_rating: 0
        }

        Lab.findOneAndUpdate({
                labname: req.session.lab.labname
            }, {
                $push: { // appends to the inventory array
                    equipment: equip_details
                }
            }, {
                safe: true,
                upsert: true
            },
            function(err, model) {
                if (err) {
                    throw err;
                } else {
                    res.redirect('/listThisLab?specificLab=' + req.session.lab.labname + '&message=' + 'Successfuly added Equipment !');
                    return next();
                }
            });
    } else {
        res.redirect('/listThisLab?specificLab=' + req.session.lab.labname + '&message=' + 'Only lab admins can add new equipment to a lab.');
    }
}


function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

function checkIfLabNameTaken(req, res, next) {
    console.log("Checking if name -" + req.body.labname + "- is already taken")
    Lab.findOne({
        labname: req.body.labname
    }, function(err, lab) {
        if (err)
            throw err;
        if (lab == null) {
            console.log("labname is good");
            res.labNameTaken = false;
            return next();
        } else {
            console.log("lab name already taken");
            res.labNameTaken = true;
            return next();
        }
    });
}

//Add new Lab to the database
function addLab(req, res, next) {
    if (res.labNameTaken) {
        res.message = "Lab Name Already taken. Please choose different name for your lab";
        res.labs = null;
        return next();
    }
    console.log("Lab Name good to use: " + req.body.labname);
    console.log("Lab Department: " + req.body.department);
    console.log("Lab Creator: " + req.user.username);
    var newLab = new Lab();
    var date = new Date();
    //Add checks to make sure all fields are as expected
    console.log("Department is: " + req.body.department);
    if (!req.body.labname || !req.body.department || !req.body.address || !req.body.specialization || !req.body.description) {
        res.labs == null;
        return next();
    }
    newLab.labname = req.body.labname;
    newLab.department = req.body.department;
    newLab.admin_name = req.user.username; // user who create the lab becomes admin by default
    newLab.admin_email = req.user.email;
    newLab.address = req.body.address;
    newLab.admin_approve = false; // this will be set to true by the super admin, untill then lab should be invisible on lab list
    newLab.rating = 0; //regular users can rate the lab out of 10
    newLab.specialization = req.body.specialization; // specialization is used for tag matching with user's area of study
    newLab.description = req.body.description;
    newLab.creation_date = date.getFullYear() + "/" + (date.getMonth() + 1) + "/" + date.getDate();
    newLab.save(function(err) {
        if (err) {
            throw err;
        }

        // here we add the newly created lab to the labs array of the user
        // because by definition admin is a member of the lab ,
        // also Note that no one can remove the admin from the lab
        User.findOneAndUpdate({
                email: req.user.email
            }, {
                $push: { // appends to the labs array
                    labs: req.body.labname
                }
            }, {
                safe: true,
                upsert: true
            },
            function(err, model) {
                if (err) {
                    console.log(err);
                    return res.send(err);
                } else {
                    res.labs = newLab;
                    return next();
                }
            });
    })
}

//Get all Labs in the database
function getAllLabs(req, res, next) {
    console.log("Fetching Labs, requested by: " + req.user.email);
    Lab.find(function(err, labs) {
        if (err)
            throw err;
        res.labs = labs;
        return next();
    });
}

//Search for a lab based on the labname
//Anyone can search for a lab, then they can dedice if they wanna join or not....
//So no need to check for anything, just make sure lab exists
function getThisLab(req, res, next) {
    console.log("Searching for: " + req.query.specificLab);
    Lab.findOne({
        labname: req.query.specificLab
    }, function(err, lab) {
        if (err)
            throw err;
        if (lab == null) {
            console.log("Lab DNE");
            res.lab = null;
            return next();
        } else {
            console.log("foudn this: " + lab.labname + " Admin is " + lab.admin_email);
            res.labs = lab;
            req.session.lab = lab;
            return next();
        }
    });
}

//Helper function to get the lab given the labname
function fetchThisLab(req, res, next) {
    console.log("Featching for: " + req.session.lab.labname);
    Lab.findOne({
        labname: req.session.lab.labname
    }, function(err, lab) {
        if (err)
            throw err;
        console.log("Fetched this: " + lab.labname);
        req.session.lab = lab;
        return next();
    });
}


//Get all Users in the database
function getAllUsers(req, res, next) {
    console.log("Fetching Labs, requested by: " + req.user.email);
    User.find(function(err, users) {
        if (err)
            throw err;
        res.users = users;
        return next();
    });
}

// send request to join a lab
function sendJoinRequest(req, res, next) {

    console.log("input Data " + " username " + req.user.username + " email " + req.user.email + " labname " + req.query.labname);
    var request_details = {
        name: req.user.username,
        email: req.user.email
    }

    Lab.findOneAndUpdate({
            labname: req.query.labname
        }, {
            $push: { // appends to the membership_requests array
                membership_requests: request_details
            }
        }, {
            safe: true,
            upsert: true
        },
        function(err, model) {
            if (err) {
                console.log(err);
                return res.send(err);
            } else {
                res.redirect('/listLabs' + '?message=' + 'Join Request Sent Successfully!');
            }
        });
}

// approve request to join a lab
function approveJoinRequest(req, res, next) {

    console.log("input Data " + " username " + req.query.name + " email " + req.query.email + " labname " + req.query.labname);
    var request_details = {
        name: req.query.name,
        email: req.query.email
    }

    Lab.findOneAndUpdate({
            labname: req.query.labname
        }, {
            $pull: { // appends to the membership_requests array
                membership_requests: request_details
            },
            $push: {
                members: request_details
            }
        }, {
            safe: true,
            upsert: true
        },
        function(err, model) {
            if (err) {
                console.log(err);
                return res.send(err);
            } else {
                // now update the user's lab array
                User.findOneAndUpdate({
                        email: req.query.email
                    }, {
                        $push: { // appends to the messages array
                            labs: req.query.labname
                        }
                    }, {
                        safe: true,
                        upsert: true
                    },
                    function(err, model) {
                        if (err) {
                            console.log(err);
                            return res.send(err);
                        } else {
                            res.redirect('/listLabMembers')
                                //res.render('listLabMembers.ejs', {
                                //    lab: req.session.lab,
                                //    message: 'Successfully approved user ' + req.query.name + ' to join ' + req.query.labname
                                //});
                        }
                    });
            } // end of else
        });
}

//Remove the user from the system
function removeUserFromSystem(req, res, next) {
    console.log("---Called to remove: " + req.body.email)
    if (req.user.usertype != "superadmin") {
        return next();
    } else {
        User.findOne({
            email: req.body.email
        }, function(err, user) {
            console.log("--Found someone");
            if (user == null || user.usertype == "admin" || user.usertype == "superadmin") {
                //cannot remove admins or super users
                return next();
            } else if (user.usertype == "reguser") {
                console.log("--Found the guy and he is a regular");
                //Now need to remove the user from all labs he is in
                for (var i = 0; i < user.labs.length; i++) {
                    console.log("removing user from lab: " + user.labs[i]);
                    removeUserFromLabHelper(user.labs[i], user.username, user.email);
                }
                console.log("Done removeing user from labs, now remove user from system");
                User.remove({
                    email: req.body.email
                }, function(err, usr) {
                    if (err) {
                        console.log("error occured in delete user by superuser");
                        throw err;
                    } else {
                        console.log("removed User");
                        return next();
                    }
                });
            }
        });
    }
}

// approve request to join a lab
function removeUserFromLab(req, res, next) {
    console.log("input Data " + " username " + req.query.name + " email " + req.query.email + " labname " + req.query.labname);
    var request_details = {
        name: req.query.name,
        email: req.query.email
    }

    Lab.findOneAndUpdate({
            labname: req.query.labname
        }, {
            $pull: { // appends to the membership_requests array
                members: request_details
            },
        }, {
            safe: true,
            upsert: true
        },
        function(err, model) {
            if (err) {
                console.log(err);
                return res.send(err);
            } else {
                // now update the user's lab array
                User.findOneAndUpdate({
                        email: req.query.email
                    }, {
                        $pull: { // appends to the messages array
                            labs: req.query.labname
                        }
                    }, {
                        safe: true,
                        upsert: true
                    },
                    function(err, model) {
                        if (err) {
                            console.log(err);
                            return res.send(err);
                        } else {
                            res.redirect('/listLabMembers')
                                //res.render('listLabMembers.ejs', {
                                //    lab: req.session.lab,
                                //    message: 'Successfully approved user ' + req.query.name + ' to join ' + req.query.labname
                                //});
                        }
                    });
            } // end of else
        });
}

//Removes the user from the lab: helper of the removeUserFromLab
function removeUserFromLabHelper(labname, username, email) {
    console.log("removing from lab: username: " + username + " email: " + email + " from lab: " + labname);
    var request_details = {
        name: username,
        email: email
    }

    Lab.findOneAndUpdate({
            labname: labname
        }, {
            $pull: { // appends to the membership_requests array
                members: request_details
            },
        }, {
            safe: true,
            upsert: true
        },
        function(err, model) {
            if (err) {
                console.log(err);
                return;
            } else {
                return;
            } // end of else
        });
}
// save private message to user schema
function saveMessage(req, res, next) {
    console.log(req.body);
    console.log("Private message From: " + req.user.username);
    console.log("Private message To: " + req.body.receiver);
    console.log("Private message Text: " + req.body.message);

    var message_details = {
        from: req.user.email,
        message: req.body.message
    }

    User.findOneAndUpdate({
            email: req.body.receiver
        }, {
            $push: { // appends to the messages array
                messages: message_details
            }
        }, {
            safe: true,
            upsert: true
        },
        function(err, model) {
            if (err) {
                console.log(err);
                return res.send(err);
            } else {
                res.redirect('/profile' + '?message=' + 'Successfully Sent Private Message');
            }
        });
}

// Post a comment on a lab page
function postComment(req, res, next) {
    if ((req && req.user && req.user.usertype != "superadmin") && (res && !res.isMember)) {
        // Through the UI alone, the user should never reach this point
        // Which means, the user was trying hard to hack the lab's rating.
        console.log("You are NOT a member of lab trying to comment on!");
        res.redirect('/listThisLab?specificLab=' + req.session.lab.labname + "&message=" + "If you are reading this, please report this instance to the superadmin.");
    } else if (req && req.body && req.body.comment && req.body.comment != "" && req.user) {
        var currentdate = new Date();
        // TODO: take care of dates and times where the number is a single digit number by adding a "0" in front...
        var datetime = "" + currentdate.getDate() + "/" + (currentdate.getMonth() + 1) + "/" + currentdate.getFullYear() + " @ " + currentdate.getHours() + ":" + currentdate.getMinutes() + ":" + currentdate.getSeconds();
        var comment_details = {
            from: req.user.email,
            time: datetime,
            comment: req.body.comment
        }

        Lab.findOneAndUpdate({
                labname: req.session.lab.labname
            }, {
                $push: { // appends to the comments array
                    comments: comment_details
                }
            }, {
                safe: true,
                upsert: true
            },
            function(err, model) {
                if (err) {
                    console.log(err);
                    return res.send(err);
                } else {
                    res.redirect('/listThisLab?specificLab=' + req.session.lab.labname + '&message=' + 'Comment posted Successfully!');
                }
            });
    } else {
        res.redirect('/listThisLab?specificLab=' + req.session.lab.labname + '&message=' + 'Unsuccesful: Please Enter a Comment');
    }
}

// Post a lab rating
function postLabRating(req, res, next) {
    if ((req && req.user && req.user.usertype != "superadmin") && (res && !res.isMember)) {
        // Through the UI alone, the user should never reach this point
        // Which means, the user was trying hard to hack the lab's rating.
        console.log("You are NOT a member of lab trying to rate!");
        res.redirect('/listThisLab?specificLab=' + req.session.lab.labname + "&message=" + "If you are reading this, please report this instance to the superadmin.");
    } else if (req && req.body && req.body.rating && req.body.rating != "" && req.user &&
        (parseInt(req.body.rating) <= 10 && parseInt(req.body.rating) >= 1)) {
        var rating_details = {
            from: req.user.email,
            rating: req.body.rating
        }

        Lab.findOneAndUpdate({
                "labname": req.session.lab.labname,
                "ratings.from": req.user.email
            }, {
                "$set": { // UPDATE EXISTING RATING
                    "ratings.$": rating_details
                }
            },
            function(err, numAffected) {
                if (err) {
                    console.log(err);
                    res.redirect('/listThisLab?specificLab=' + req.session.lab.labname + "&message=" + "Error rating.");
                }
                if (numAffected == null || numAffected == 0) {
                    Lab.findOneAndUpdate({
                            labname: req.session.lab.labname
                        }, {
                            $push: { // INSERT NEW RATING
                                ratings: rating_details
                            }
                        },
                        function(err, model) {
                            if (err) {
                                console.log(err);
                                res.redirect('/listThisLab?specificLab=' + req.session.lab.labname + "&message=" + "Error rating.");
                            }
                        });
                }
                res.redirect('/listThisLab?specificLab=' + req.session.lab.labname + "&message=" + "Rated successfully!");
            });
    } else {
        res.redirect('/listThisLab?specificLab=' + req.session.lab.labname + "&message=" + "Error rating.");
    }
}

// Post equipment rating
function postEquipmentRating(req, res, next) {
    var lab = req.session.lab;
    if (!res.isMember) {
        console.log("User is not a member of the lab whose equip user is trying to book.");
        res.redirect('/listThisLab?specificLab=' + req.session.lab.labname + "&message=" + "Serious security issue detected; please report this incident to the super admin.");
    } else if (lab != null && lab.equipment[req.body.equip_id]) {
        var ratings = lab.equipment[req.body.equip_id].ratings;
        console.log("Equip ratings = " + ratings);

        if (req && req.body && req.body.equip_rating && req.body.equip_rating != "" &&
            req.body.equip_id && req.body.equip_id != "" && req.user &&
            (parseInt(req.body.equip_rating) <= 10 && parseInt(req.body.equip_rating) >= 1)) {
            // construct an equip ratings object...
            var rating_details = {
                from: req.user.email,
                rating: req.body.equip_rating
            }

            // update existing record if one exists; or insert a new one if none exist

            var needle = req.user.email; // we are searching for this
            var found_count = false; // keep a count of how many we found

            // iterate over each rating in the array to find a rating by user
            for (var i = 0; i < ratings.length; i++) {
                if (ratings[i].from == needle) { // find the user
                    found_count = true;
                    ratings[i].rating = req.body.equip_rating; // update old rating
                }
            }

            // if none found, insert new...
            if (found_count == false) {
                ratings.push(rating_details);
            }

            lab.equipment[req.body.equip_id].ratings = ratings; // insert newly updated rating array


            // Update ratings count and the average rating

            var sum = 0;

            // iterate over each rating in the array to find a rating by user
            for (var i = 0; i < ratings.length; i++) {
                sum += parseInt(ratings[i].rating);
            }

            lab.equipment[req.body.equip_id].number_of_ratings = parseInt(ratings.length);

            if (parseInt(ratings.length) <= 0)
                lab.equipment[req.body.equip_id].overall_rating = 0;
            else
                lab.equipment[req.body.equip_id].overall_rating = sum / parseInt(ratings.length);


            lab.save(function(err) {
                if (err)
                    throw err;
            });
        }

        res.redirect('/listThisLab?specificLab=' + req.session.lab.labname + "&message=" + "Equipment rated successfully.");
    } else {
        res.redirect('/listThisLab?specificLab=' + req.session.lab.labname + "&message=" + "Equipment rating failed.");
    }
};


// Post equipment comment
function postEquipmentComment(req, res, next) {
    var lab = req.session.lab;
    if (!res.isMember) {
        console.log("User is not a member of the lab whose equip user is trying to comment on.");
        res.redirect('/listThisLab?specificLab=' + req.session.lab.labname + "&message=" + "Serious security issue detected; please report this incident to the super admin.");
    } else if (lab != null && lab.equipment[req.body.equip_id]) {
        var comments = lab.equipment[req.body.equip_id].comments;
        console.log("Equip comments = " + comments);

        if (req && req.body && req.body.equip_comment && req.body.equip_comment != "" &&
            req.body.equip_id && req.body.equip_id != "" && req.user) {
            // construct an equip comments object...
            var currentdate = new Date();
            // TODO: take care of dates and times where the number is a single digit number by adding a "0" in front...
            var datetime = "" + currentdate.getDate() + "/" + (currentdate.getMonth() + 1) + "/" + currentdate.getFullYear() + " @ " + currentdate.getHours() + ":" + currentdate.getMinutes() + ":" + currentdate.getSeconds();

            comments.push({
                from: req.user.email,
                time: datetime,
                comment: req.body.equip_comment
            });

            lab.equipment[req.body.equip_id].comments = comments; // insert newly updated rating array

            lab.save(function(err) {
                if (err)
                    throw err;
            });
        }
        res.redirect('/listThisLab?specificLab=' + req.session.lab.labname + "&message=" + "Equipment comment successful.");
    } else {
        res.redirect('/listThisLab?specificLab=' + req.session.lab.labname + "&message=" + "Equipment comment failed.");
    }
};


// save private message to user schema
function deleteMessage(req, res, next) {
    console.log(req.query);

    var message_details = {
        from: req.query.from,
        message: req.query.message,
    }

    User.findOneAndUpdate({
            email: req.user.email
        }, {
            $pull: { // delete from the messages array
                messages: message_details
            }
        }, {
            safe: true,
            upsert: true
        },
        function(err, model) {
            if (err) {
                console.log(err);
                return res.send(err);
            } else {
                res.redirect('/listMessages' + '?message=' + 'Deleted Message Successfully!')
            }
        });
}

// reply to private message
function replyMessage(req, res, next) {
    console.log(req.body.reply);

    var message_details = {
        from: req.user.email,
        message: req.body.reply
    }

    User.findOneAndUpdate({
            email: req.query.receiver
        }, {
            $push: { // appends to the messages array
                messages: message_details
            }
        }, {
            safe: true,
            upsert: true
        },
        function(err, model) {
            if (err) {
                console.log(err);
                return res.send(err);
            } else {
                res.redirect('/listMessages' + '?message=' + 'Replied to Message Successfully!')
            }
        });
}
