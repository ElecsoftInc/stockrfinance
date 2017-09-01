"use strict";

require('dotenv').config();

const PORT        = process.env.PORT || 8080;
const ENV         = process.env.ENV || "development";
const express     = require("express");
const bodyParser  = require("body-parser");
const sass        = require("node-sass-middleware");
const app         = express();

const knexConfig  = require("./knexfile");
const knex        = require("knex")(knexConfig[ENV]);
const morgan      = require('morgan');
const knexLogger  = require('knex-logger');
const session     = require('express-session');
const bcrypt      = require('bcrypt');
const cloudinary  = require('cloudinary');
const multer      = require('multer');
const upload      = multer({ dest: 'uploads/' });
const fs          = require('fs');
const http        = require ('http');
//const multiparty  = require('multiparty')


// Seperated Routes for each Resource
//const usersRoutes = require("./routes/users");

// Load the logger first so all (static) HTTP requests are logged to STDOUT
// 'dev' = Concise output colored by response status for development use.
//         The :status token will be colored red for server error codes, yellow for client error codes, cyan for redirection codes, and uncolored for all other codes.
app.use(morgan('dev'));

app.use(session({
  secret: 'sshshshsjsdkbh',
  resave: true,
  saveUninitialized: true
}));

// Log knex SQL queries to STDOUT as well
app.use(knexLogger(knex));

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/styles", sass({
  src: __dirname + "/styles",
  dest: __dirname + "/public/styles",
  debug: true,
  outputStyle: 'expanded'
}));
app.use(express.static("public"));

//image upload platform initialisation
cloudinary.config({
  cloud_name: 'elecsoft-consulting',
  api_key: process.env.IMAGE_KEY,
  api_secret: process.env.IMAGE_SECRET
});

// Mount all resource routes
//app.use("/api/users", usersRoutes(knex));

// Home page. Checks to see if the session exists. If it does, the logged in user's name is selected
// from the db and sent to the front end to be displayed. If no user exists, empty object is passed
// to prevent page crash.
app.get("/", (req, res) => {
  if(req.session.userID){
    knex('users')
        .select('*')
        .where({
          users_id: req.session.userID
        })
    .then((response)=> {
      console.log("this is the response", response)
      console.log('person name', response[0].full_name)
      knex('posts')
          .select('*')
          .orderBy('date_written', 'desc')
          .limit(3)
      .then((response2)=> {
        console.log('second response', response2)
        var templateVariable = {
          name: response[0].full_name,
          user: req.session.userID,
          response2: response2
        }
        res.render("index", templateVariable);
      })
    })
  } else {
    knex('posts')
        .select('*')
        .orderBy('date_written', 'desc')
        .limit(3)
    .then((response2)=> {
      console.log('response2', response2)
      var templateVariable = {
        name: null,
        user: null,
        response2: response2
      }
      res.render('index', templateVariable);
    })
  }
});

//Login Page. If session exists, autmatic redirect to home page.
app.get('/login', (req, res) => {
  if(req.session.userID){
    res.redirect('/')
  } else {
  res.render('login')
  }
})

// Posting login form. Selects * from db where email = email typed in by user.
// Compares password in db to password entered, if passwords match, sets session to the user id.
app.post('/loggingIn', (req, res)=> {
  console.log('req.body', req.body)
  console.log('password', req.body.password)
  knex('users')
      .select('*')
      .where ({
        email: req.body.email
      })
  .then((response)=> {
    console.log('response. This is the user', response)
    console.log('password_hash',response[0].password_hash)
    var passMatch = bcrypt.compareSync(req.body.password, response[0].password_hash)
    if (passMatch === true){
        req.session.userID = response[0].users_id;
        req.session.name = response[0].full_name;
        console.log('req.session has been set to', req.session)
        res.redirect('/')
    } else {
      res.send('I dont know you.')
    }
  })
})

// Destroys session and redirects to home page.
app.get('/logout', (req, res)=> {
  req.session.destroy(function(err) {
    if(err) {
      console.log(err);
    } else {
      console.log('req.session',req.session)
      res.redirect('/');
    }
  })
})

// Sign up page. If session exists, autmatic redirect to home page.
app.get('/signup', (req, res)=> {
  if(req.session.userID){
    res.redirect('/')
  }else {
    res.render('signup')
  }
})

// Sign up form posted. Information entered into database. Then,
// id selected from db where email in db = email entered and then sets session to that id and redirects to home page
app.post('/signingUp', (req, res)=> {
  console.log('req.body', req.body)
  console.log('time right now', Date.now())
  var hashedPassword = bcrypt.hashSync(req.body.password, 10);
  console.log('HELLLLLLO AFTER BCRYPT')
  console.log('password', req.body.password);
  console.log('hash', hashedPassword);
  knex('users')
    .insert([{
      full_name: req.body.personName,
      email: req.body.email,
      password_hash: hashedPassword,
      bio: req.body.bio,
      created_at: new Date
    }])
  .then((response)=> {
    console.log('inside insert response', response)
    knex
        .select('users_id', 'full_name')
        .from('users')
        .where({
          email: req.body.email
        })
        .then((response)=> {
          console.log('inside second then', response)
          req.session.userID = response[0].users_id;
          req.session.name = response[0].full_name;
          console.log('session exists', req.session)
          res.redirect('/')
        })
  })
})

// Write article page. Can only be accessed if logged in. Or else you'll be redirected to the home page.
// Selects name from db to display on the navbar and on the page
app.get('/write', (req, res)=> {
  if(req.session.userID){
    knex
        .select('full_name')
        .from('users')
        .where({
          users_id: req.session.userID
        })
    .then((response)=> {
      console.log('response', response)
      console.log('name', response[0].full_name)
      var name = response[0].full_name.split(' ');
      console.log('first name in array', name[0])
      var templateVariable = {
        name: name[0],
        full_name: response[0].full_name
      }
      res.render('write', templateVariable)
    })
  } else {
    res.redirect('/')
  }
})

// Written article form submitted if session exists. Need to figure out how to handle image uploads.
app.post('/submitArticle', upload.single('image') ,(req, res)=> {
  if (req.session.userID){

    console.log('BODY',req.body)
    console.log('file',req.file)
    console.log('filename', req.file.filename)

    cloudinary.uploader.upload(req.file.path, (result)=> {
      console.log('result', result)
      var fileUrl = result.secure_url;
      console.log('File url:', fileUrl);

      if(fileUrl){
        fs.unlinkSync('./uploads/' + req.file.filename)
        console.log('temp file ', req.file.filename,' deleted');
      }

      knex('posts')
          .insert([{
            title: req.body.title,
            content: req.body.story,
            image_url: fileUrl,
            author_id: req.session.userID,
            date_written: new Date
          }])
      .then((response)=> {
        console.log('The article has been inserted', response)
        knex('posts')
            .select('posts_id')
            .where({
              title: req.body.title
            })
        .then((response2)=> {
          console.log('this should be the article_id', response2[0].posts_id)
          knex('comments')
              .insert([{
                description: 'Thank you for contributing to our community!!',
                article_id: response2[0].posts_id,
                date_created: new Date,
                commenter_id: null,
                commenter_name: 'Stockr Finance'
              }])
          .then((response3)=> {
            console.log('if you can see this, comment has been inserted. EVERYTHING SHOULD WORK NOW')
            res.redirect('/blog')
          })
        })
      })
    });
  } else {
    res.send('SOMETHING went wrong. VERY WRONG')
  }
})

// Blog page where all the articles are displayed. If session exists your name will also be
// displayed on the navbar. Or else it wont. Articles need to be displayed on the blog page using id's.
app.get('/blog', (req, res)=> {
  if(req.session.userID){
    knex
      .select('full_name')
      .from('users')
      .where({
        users_id: req.session.userID
      })
    .then((response1)=> {
      console.log('response', response1)
      console.log('name', response1[0].full_name)
      knex('posts')
          .join('users', 'posts.author_id', '=', 'users.users_id')
          .select('*')
      .then((response2)=> {
        console.log('response2', response2)
        console.log('is response1 still available???', response1)
        var templateVariable = {
          name: response1[0].full_name,
          response2: response2
        }
        res.render('blog', templateVariable);
      })
    })
  } else {
    knex('posts')
      .join('users', 'posts.author_id', '=', 'users.users_id')
      .select('*')
    .then((response)=> {
      console.log('response when user does not exist', response)
      //console.log('is response1 still available???', response1)
      var templateVariable = {
        name: null,
        response: response
      }
      res.render('blog', templateVariable);
    })

  }

})

// Get specific article page needs to be done through ids.
// Comments also need to be selected acc to article id.
app.get('/article/:id', (req, res)=> {
  console.log('params', req.params)
  if(req.session.userID){
    knex('posts')
      .join('users', 'posts.author_id', '=', 'users.users_id')
      .join('comments', 'posts.posts_id', '=', 'comments.article_id', 'users.users_id', '=', 'comments.commenter_id')
      .select('*')
      .where({
        posts_id: req.params.id
      })
    .then((response2)=> {
      console.log('response2', response2)
      var templateVariable = {
        name: req.session.name,
        response2: response2
      }
      res.render('oneArticle', templateVariable);
    })
  } else {
    knex('posts')
      .join('users', 'posts.author_id', '=', 'users.users_id')
      .join('comments', 'posts.posts_id', '=', 'comments.article_id', 'users.users_id', '=', 'comments.commenter_id')
      .select('*')
      .where({
        posts_id: req.params.id
      })
    .then((response2)=> {
      console.log('response', response2)
      var templateVariable = {
        name: null,
        response2: response2
      }
      res.render('oneArticle', templateVariable);
    })
  }
})

// Comment entered on specific article entered into database. Need detailed explanation
app.post('/postComment', (req, res)=> {
  console.log("Yaha dekh ",req.body)
  if (req.session.userID) {
    knex('comments')
        .insert([{
          description: req.body.text,
          article_id: req.body.article_id,
          date_created: req.body.date,
          commenter_id: req.session.userID,
          commenter_name: req.session.name
        }])
    .then((response1)=> {
       console.log('INSERT SUCCESSFUL', response1)
       knex('comments')
           .join('users', 'comments.commenter_id', '=', 'users.users_id')
           .select('full_name')
           .where({
             users_id: req.session.userID
           })
       .then((response2)=> {
         console.log('NAME SELECTED', response2)
         var templateVariable = { commenterName: response2[0].full_name, status: 'success'}
         res.send(JSON.stringify(templateVariable))
       })
    })
  } else {
    knex('comments')
        .insert([{
          description: req.body.text,
          article_id: req.body.article_id,
          date_created: req.body.date,
          commenter_name: null,
          commenter_id: null
        }])
    .then((response1)=> {
       console.log('INSERT SUCCESSFUL', response1)
       var templateVariable = { commenterName: 'Anonymous', status: 'success'}
       res.send(JSON.stringify(templateVariable))
    })
  }
})

//var http = require ('http');

app.get('/wsj', (req, res)=> {
  if(req.session.userID){
    console.log('session exists', req.session.name)
    var url = 'http://newsapi.org/v1/articles?source=the-wall-street-journal&sortBy=top&apiKey=f43f221fbd094da99409fcabf4ff0de2';
    //using http to get the json object
    var object = '';

    var data;
    http.get(url, function(response){
      // var object = '';

      response.on('data', (chunk)=> {
        object += chunk;
        //var data = JSON.parse(object);
        //console.log("right here buddy",data)
      })

      response.on('end', function(){
        data = JSON.parse(object);
        console.log("Got a response: ", data);
        console.log('length',data.articles.length)
        var templateVariable = {
          data: data.articles,
          name: req.session.name,
          user: req.session.userID,
          sourceName: "The Wall Street Journal"
        }
        res.render('newsApi', templateVariable)
      });
    }).on('error', (e)=>{
      console.log('got an error', e)
    })
  } else {
    var url = 'http://newsapi.org/v1/articles?source=the-wall-street-journal&sortBy=top&apiKey=f43f221fbd094da99409fcabf4ff0de2';
    //using http to get the json object
    var object = '';

    var data;
    http.get(url, function(response){
      // var object = '';

      response.on('data', (chunk)=> {
        object += chunk;
        //var data = JSON.parse(object);
        //console.log("right here buddy",data)
      })

      response.on('end', function(){
        data = JSON.parse(object);
        console.log("Got a response: ", data);
        console.log('length',data.articles.length)
        var templateVariable = {
          data: data.articles,
          name: null,
          user: null,
          sourceName: "The Wall Street Journal"
        }
        res.render('newsApi', templateVariable)
      });
    }).on('error', (e)=>{
      console.log('got an error', e)
    })
  }

})

app.get('/businessInsider', (req, res)=> {
  if(req.session.userID){
    var url = 'http://newsapi.org/v1/articles?source=business-insider&sortBy=top&apiKey=f43f221fbd094da99409fcabf4ff0de2';
    //using http to get the json object
    var object = '';

    var data;
    http.get(url, function(response){
      // var object = '';

      response.on('data', (chunk)=> {
        object += chunk;
        //var data = JSON.parse(object);
        //console.log("right here buddy",data)
      })

      response.on('end', function(){
        data = JSON.parse(object);
        console.log("Got a response: ", data);
        console.log('length',data.articles.length)
        var templateVariable = {
          data: data.articles,
          name: req.session.name,
          user: req.session.userID,
          sourceName: "Business Insider"
        }
        res.render('newsApi', templateVariable)
      });
    }).on('error', (e)=>{
      console.log('got an error', e)
    })
  } else {
    var url = 'http://newsapi.org/v1/articles?source=business-insider&sortBy=top&apiKey=f43f221fbd094da99409fcabf4ff0de2';
    //using http to get the json object
    var object = '';

    var data;
    http.get(url, function(response){
      // var object = '';

      response.on('data', (chunk)=> {
        object += chunk;
        //var data = JSON.parse(object);
        //console.log("right here buddy",data)
      })

      response.on('end', function(){
        data = JSON.parse(object);
        console.log("Got a response: ", data);
        console.log('length',data.articles.length)
        var templateVariable = {
          data: data.articles,
          name: null,
          user: null,
          sourceName: "Business Insider"
        }
        res.render('newsApi', templateVariable)
      });
    }).on('error', (e)=>{
      console.log('got an error', e)
    })
  }

})

app.get('/economist', (req, res)=> {
  if(req.session.userID){
    console.log('LOOOK HERE,', req.session)
    var url = 'http://newsapi.org/v1/articles?source=the-economist&sortBy=top&apiKey=f43f221fbd094da99409fcabf4ff0de2';
    //using http to get the json object
    var object = '';

    var data;
    http.get(url, function(response){
      // var object = '';

      response.on('data', (chunk)=> {
        object += chunk;
        //var data = JSON.parse(object);
        //console.log("right here buddy",data)
      })

      response.on('end', function(){
        data = JSON.parse(object);
        console.log("Got a response: ", data);
        console.log('length',data.articles.length)
        var templateVariable = {
          data: data.articles,
          name: req.session.name,
          user: req.session.userID,
          sourceName: "The Economist"
        }
        res.render('newsApi', templateVariable)
      });
    }).on('error', (e)=>{
      console.log('got an error', e)
    })
  } else {
    var url = 'http://newsapi.org/v1/articles?source=the-economist&sortBy=top&apiKey=f43f221fbd094da99409fcabf4ff0de2';
    //using http to get the json object
    var object = '';

    var data;
    http.get(url, function(response){
      // var object = '';

      response.on('data', (chunk)=> {
        object += chunk;
        //var data = JSON.parse(object);
        //console.log("right here buddy",data)
      })

      response.on('end', function(){
        data = JSON.parse(object);
        console.log("Got a response: ", data);
        console.log('length',data.articles.length)
        var templateVariable = {
          data: data.articles,
          name: null,
          user: null,
          sourceName: "The Economist"
        }
        res.render('newsApi', templateVariable)
      });
    }).on('error', (e)=>{
      console.log('got an error', e)
    })
  }

})

app.get('/bloomberg', (req, res)=> {
  if(req.session.userID){
    console.log('LOOOK HERE,', req.session)
    var url = 'http://newsapi.org/v1/articles?source=bloomberg&sortBy=top&apiKey=f43f221fbd094da99409fcabf4ff0de2';
    //using http to get the json object
    var object = '';

    var data;
    http.get(url, function(response){
      // var object = '';

      response.on('data', (chunk)=> {
        object += chunk;
        //var data = JSON.parse(object);
        //console.log("right here buddy",data)
      })

      response.on('end', function(){
        data = JSON.parse(object);
        console.log("Got a response: ", data);
        console.log('length',data.articles.length)
        var templateVariable = {
          data: data.articles,
          name: req.session.name,
          user: req.session.userID,
          sourceName: "Bloomberg"
        }
        res.render('newsApi', templateVariable)
      });
    }).on('error', (e)=>{
      console.log('got an error', e)
    })
  } else {
    var url = 'http://newsapi.org/v1/articles?source=bloomberg&sortBy=top&apiKey=f43f221fbd094da99409fcabf4ff0de2';
    //using http to get the json object
    var object = '';

    var data;
    http.get(url, function(response){
      // var object = '';

      response.on('data', (chunk)=> {
        object += chunk;
        //var data = JSON.parse(object);
        //console.log("right here buddy",data)
      })

      response.on('end', function(){
        data = JSON.parse(object);
        console.log("Got a response: ", data);
        console.log('length',data.articles.length)
        var templateVariable = {
          data: data.articles,
          name: null,
          user: null,
          sourceName: "Bloomberg"
        }
        res.render('newsApi', templateVariable)
      });
    }).on('error', (e)=>{
      console.log('got an error', e)
    })
  }

})

app.get('/fortune', (req, res)=> {
  if(req.session.userID){
    console.log('LOOOK HERE,', req.session)
    var url = 'http://newsapi.org/v1/articles?source=fortune&sortBy=top&apiKey=f43f221fbd094da99409fcabf4ff0de2';
    //using http to get the json object
    var object = '';

    var data;
    http.get(url, function(response){
      // var object = '';

      response.on('data', (chunk)=> {
        object += chunk;
        //var data = JSON.parse(object);
        //console.log("right here buddy",data)
      })

      response.on('end', function(){
        data = JSON.parse(object);
        console.log("Got a response: ", data);
        console.log('length',data.articles.length)
        var templateVariable = {
          data: data.articles,
          name: req.session.name,
          user: req.session.userID,
          sourceName: "Fortune"
        }
        res.render('newsApi', templateVariable)
      });
    }).on('error', (e)=>{
      console.log('got an error', e)
    })
  } else {
    var url = 'http://newsapi.org/v1/articles?source=fortune&sortBy=top&apiKey=f43f221fbd094da99409fcabf4ff0de2';
    //using http to get the json object
    var object = '';

    var data;
    http.get(url, function(response){
      // var object = '';

      response.on('data', (chunk)=> {
        object += chunk;
        //var data = JSON.parse(object);
        //console.log("right here buddy",data)
      })

      response.on('end', function(){
        data = JSON.parse(object);
        console.log("Got a response: ", data);
        console.log('length',data.articles.length)
        var templateVariable = {
          data: data.articles,
          name: null,
          user: null,
          sourceName: "Fortune"
        }
        res.render('newsApi', templateVariable)
      });
    }).on('error', (e)=>{
      console.log('got an error', e)
    })
  }

})

app.get('/nytimes', (req, res)=> {
  if(req.session.userID){
    console.log('LOOOK HERE,', req.session)
    var url = 'http://newsapi.org/v1/articles?source=the-new-york-times&sortBy=top&apiKey=f43f221fbd094da99409fcabf4ff0de2';
    //using http to get the json object
    var object = '';

    var data;
    http.get(url, function(response){
      // var object = '';

      response.on('data', (chunk)=> {
        object += chunk;
        //var data = JSON.parse(object);
        //console.log("right here buddy",data)
      })

      response.on('end', function(){
        data = JSON.parse(object);
        console.log("Got a response: ", data);
        console.log('length',data.articles.length)
        var templateVariable = {
          data: data.articles,
          name: req.session.name,
          user: req.session.userID,
          sourceName: "The New York Times"
        }
        res.render('newsApi', templateVariable)
      });
    }).on('error', (e)=>{
      console.log('got an error', e)
    })
  } else {
    var url = 'http://newsapi.org/v1/articles?source=the-new-york-times&sortBy=top&apiKey=f43f221fbd094da99409fcabf4ff0de2';
    //using http to get the json object
    var object = '';

    var data;
    http.get(url, function(response){
      // var object = '';

      response.on('data', (chunk)=> {
        object += chunk;
        //var data = JSON.parse(object);
        //console.log("right here buddy",data)
      })

      response.on('end', function(){
        data = JSON.parse(object);
        console.log("Got a response: ", data);
        console.log('length',data.articles.length)
        var templateVariable = {
          data: data.articles,
          name: null,
          user: null,
          sourceName: "The New York Times"
        }
        res.render('newsApi', templateVariable)
      });
    }).on('error', (e)=>{
      console.log('got an error', e)
    })
  }
})

app.get('/cnbc', (req, res)=> {
  if(req.session.userID){
    console.log('LOOOK HERE,', req.session)
    var url = 'http://newsapi.org/v1/articles?source=cnbc&sortBy=top&apiKey=f43f221fbd094da99409fcabf4ff0de2';
    //using http to get the json object
    var object = '';

    var data;
    http.get(url, function(response){
      // var object = '';

      response.on('data', (chunk)=> {
        object += chunk;
        //var data = JSON.parse(object);
        //console.log("right here buddy",data)
      })

      response.on('end', function(){
        data = JSON.parse(object);
        console.log("Got a response: ", data);
        console.log('length',data.articles.length)
        var templateVariable = {
          data: data.articles,
          name: req.session.name,
          user: req.session.userID,
          sourceName: "CNBC"
        }
        res.render('newsApi', templateVariable)
      });
    }).on('error', (e)=>{
      console.log('got an error', e)
    })
  } else {
    var url = 'http://newsapi.org/v1/articles?source=cnbc&sortBy=top&apiKey=f43f221fbd094da99409fcabf4ff0de2';
    //using http to get the json object
    var object = '';

    var data;
    http.get(url, function(response){
      // var object = '';

      response.on('data', (chunk)=> {
        object += chunk;
        //var data = JSON.parse(object);
        //console.log("right here buddy",data)
      })

      response.on('end', function(){
        data = JSON.parse(object);
        console.log("Got a response: ", data);
        console.log('length',data.articles.length)
        var templateVariable = {
          data: data.articles,
          name: null,
          user: null,
          sourceName: "CNBC"
        }
        res.render('newsApi', templateVariable)
      });
    }).on('error', (e)=>{
      console.log('got an error', e)
    })
  }
})

app.get('/aljazeera', (req, res)=> {
  if(req.session.userID){
    console.log('LOOOK HERE,', req.session)
    var url = 'http://newsapi.org/v1/articles?source=al-jazeera-english&sortBy=top&apiKey=f43f221fbd094da99409fcabf4ff0de2';
    //using http to get the json object
    var object = '';

    var data;
    http.get(url, function(response){
      // var object = '';

      response.on('data', (chunk)=> {
        object += chunk;
        //var data = JSON.parse(object);
        //console.log("right here buddy",data)
      })

      response.on('end', function(){
        data = JSON.parse(object);
        console.log("Got a response: ", data);
        console.log('length',data.articles.length)
        var templateVariable = {
          data: data.articles,
          name: req.session.name,
          user: req.session.userID,
          sourceName: "Al Jazeera"
        }
        res.render('newsApi', templateVariable)
      });
    }).on('error', (e)=>{
      console.log('got an error', e)
    })
  } else {
    var url = 'http://newsapi.org/v1/articles?source=al-jazeera-english&sortBy=top&apiKey=f43f221fbd094da99409fcabf4ff0de2';
    //using http to get the json object
    var object = '';

    var data;
    http.get(url, function(response){
      // var object = '';

      response.on('data', (chunk)=> {
        object += chunk;
        //var data = JSON.parse(object);
        //console.log("right here buddy",data)
      })

      response.on('end', function(){
        data = JSON.parse(object);
        console.log("Got a response: ", data);
        console.log('length',data.articles.length)
        var templateVariable = {
          data: data.articles,
          name: null,
          user: null,
          sourceName: "Al Jazeera"
        }
        res.render('newsApi', templateVariable)
      });
    }).on('error', (e)=>{
      console.log('got an error', e)
    })
  }
})

app.get('/google', (req, res)=> {
  if(req.session.userID){
    console.log('LOOOK HERE,', req.session)
    var url = 'http://newsapi.org/v1/articles?source=google-news&sortBy=top&apiKey=f43f221fbd094da99409fcabf4ff0de2';
    //using http to get the json object
    var object = '';

    var data;
    http.get(url, function(response){
      // var object = '';

      response.on('data', (chunk)=> {
        object += chunk;
        //var data = JSON.parse(object);
        //console.log("right here buddy",data)
      })

      response.on('end', function(){
        data = JSON.parse(object);
        console.log("Got a response: ", data);
        console.log('length',data.articles.length)
        var templateVariable = {
          data: data.articles,
          name: req.session.name,
          user: req.session.userID,
          sourceName: "Google News"
        }
        res.render('newsApi', templateVariable)
      });
    }).on('error', (e)=>{
      console.log('got an error', e)
    })
  } else {
    var url = 'http://newsapi.org/v1/articles?source=google-news&sortBy=top&apiKey=f43f221fbd094da99409fcabf4ff0de2';
    //using http to get the json object
    var object = '';

    var data;
    http.get(url, function(response){
      // var object = '';

      response.on('data', (chunk)=> {
        object += chunk;
        //var data = JSON.parse(object);
        //console.log("right here buddy",data)
      })

      response.on('end', function(){
        data = JSON.parse(object);
        console.log("Got a response: ", data);
        console.log('length',data.articles.length)
        var templateVariable = {
          data: data.articles,
          name: null,
          user: null,
          sourceName: "Google News"
        }
        res.render('newsApi', templateVariable)
      });
    }).on('error', (e)=>{
      console.log('got an error', e)
    })
  }
})

app.get('/toi', (req, res)=> {
  if(req.session.userID){
    console.log('LOOOK HERE,', req.session)
    var url = 'http://newsapi.org/v1/articles?source=the-times-of-india&sortBy=top&apiKey=f43f221fbd094da99409fcabf4ff0de2';
    //using http to get the json object
    var object = '';

    var data;
    http.get(url, function(response){
      // var object = '';

      response.on('data', (chunk)=> {
        object += chunk;
        //var data = JSON.parse(object);
        //console.log("right here buddy",data)
      })

      response.on('end', function(){
        data = JSON.parse(object);
        console.log("Got a response: ", data);
        console.log('length',data.articles.length)
        var templateVariable = {
          data: data.articles,
          name: req.session.name,
          user: req.session.userID,
          sourceName: "The Times Of India"
        }
        res.render('newsApi', templateVariable)
      });
    }).on('error', (e)=>{
      console.log('got an error', e)
    })
  } else {
    var url = 'http://newsapi.org/v1/articles?source=the-times-of-india&sortBy=top&apiKey=f43f221fbd094da99409fcabf4ff0de2';
    //using http to get the json object
    var object = '';

    var data;
    http.get(url, function(response){
      // var object = '';

      response.on('data', (chunk)=> {
        object += chunk;
        //var data = JSON.parse(object);
        //console.log("right here buddy",data)
      })

      response.on('end', function(){
        data = JSON.parse(object);
        console.log("Got a response: ", data);
        console.log('length',data.articles.length)
        var templateVariable = {
          data: data.articles,
          name: null,
          user: null,
          sourceName: "The Times Of India"
        }
        res.render('newsApi', templateVariable)
      });
    }).on('error', (e)=>{
      console.log('got an error', e)
    })
  }
})

app.get('/reuters', (req, res)=> {
  if(req.session.userID){
    console.log('LOOOK HERE,', req.session)
    var url = 'http://newsapi.org/v1/articles?source=reuters&sortBy=top&apiKey=f43f221fbd094da99409fcabf4ff0de2';
    //using http to get the json object
    var object = '';

    var data;
    http.get(url, function(response){
      // var object = '';

      response.on('data', (chunk)=> {
        object += chunk;
        //var data = JSON.parse(object);
        //console.log("right here buddy",data)
      })

      response.on('end', function(){
        data = JSON.parse(object);
        console.log("Got a response: ", data);
        console.log('length',data.articles.length)
        var templateVariable = {
          data: data.articles,
          name: req.session.name,
          user: req.session.userID,
          sourceName: "Reuters"
        }
        res.render('newsApi', templateVariable)
      });
    }).on('error', (e)=>{
      console.log('got an error', e)
    })
  } else {
    var url = 'http://newsapi.org/v1/articles?source=reuters&sortBy=top&apiKey=f43f221fbd094da99409fcabf4ff0de2';
    //using http to get the json object
    var object = '';

    var data;
    http.get(url, function(response){
      // var object = '';

      response.on('data', (chunk)=> {
        object += chunk;
        //var data = JSON.parse(object);
        //console.log("right here buddy",data)
      })

      response.on('end', function(){
        data = JSON.parse(object);
        console.log("Got a response: ", data);
        console.log('length',data.articles.length)
        var templateVariable = {
          data: data.articles,
          name: null,
          user: null,
          sourceName: "Reuters"
        }
        res.render('newsApi', templateVariable)
      });
    }).on('error', (e)=>{
      console.log('got an error', e)
    })
  }
})

app.listen(PORT, () => {
  console.log("Example app listening on port " + PORT);
});
