# HTTP SERVER Notes

## Error-Handling Middleware

Express allows you to capture and handle errors using special middleware. An error-handling middleware function has four parameters: (err, req, res, next).

1. `Synchronous` errors (thrown in your route handlers) AUTOMATICALLY skip normal middleware and go straight to this error handler.

2. `Asynchronous` errors (in async functions) must be CAUGHT or PASSED TO next(err) so they can also be handled here.

When an error reaches your error handler, you can respond with a 500 status code or any other status you choose.

```js
function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Uh oh, spaghetti-o');
  res.status(500).json({
    error: 'Boots has fallen',
  });
}

app.use(errorHandler);
```

## Error handling middleware needs to be defined last, after other app.use() and routes.

# Catching Errors in Async Code

```js 

app.post("/api", async (req, res, next) => {
  try {
    await handler(req, res);
  } catch (err) {
    next(err); // Pass the error to Express
  }
});

OR

app.post("/api", (req, res, next) => {
  Promise.resolve(handler(req, res)).catch(next);
});

```

<hr />

# Storage

## Memory vs. Disk
When you run a program on your computer (like our HTTP server), the program is loaded into memory. 

Memory is a lot like a scratch pad. It's fast, but it's not permanent. If the program terminates or restarts, the data in memory is lost.

When you're building a web server, any data you store in memory (in your program's variables) is lost when the server is restarted. Any important data needs to be saved to disk via the file system.

### Option 1: Raw Files

We could take our user's data, serialize it to JSON, and save it to disk in `.json` files (or any other format for that matter). 

It's simple, and will even work for small applications. Trouble is, it will run into problems fast:

- Concurrency: If two requests try to write to the same file at the same time, you'll get overwritten data.
- Scalability: It's not efficient to read and write large files to disk for every request.
- Complexity: You'll have to write a lot of code to manage the files, and the chances of bugs are high.

### Option 2: a Database

At the end of the day, a database technology like MySQL, PostgreSQL, or MongoDB "just" writes files to disk. 

The difference is that they also come with all the fancy code and algorithms that make managing those files efficient and safe. 

In the case of a SQL database, the files are abstracted away from us entirely. You just write SQL queries and let the DB handle the rest.

We will be using option 2: PostgreSQL. It's a production-ready, open-source SQL database. It's a great choice for many web applications, and as a back-end engineer, it might be the single most important database to be familiar with.

<hr />

## Migration?

A migration is just a `set of changes` to your database table.

You can have as many migrations as needed as your requirements change over time. 

For example, one migration might create a new table, one might delete a column, and one might add 2 new columns.

- An "up" migration moves the state of the database from its current schema to the schema that you want.

- So, to get a "blank" database to the state it needs to be ready to run your application, you run all the "up" migrations.

- If something breaks, you can run one of the "down" migrations to REVERT the database TO a previous state. "Down" migrations are also used if you need to RESET a local testing database to a KNOWN state.

# Authentication With Passwords

Authentication is the process of verifying who a user is. If you don't have a secure authentication system, your back-end systems will be open to attack!

Imagine if I could make an HTTP request to the YouTube API and upload a video to your channel. YouTube's authentication system prevents this from happening by verifying that I am who I say I am.

## Passwords
Passwords are a common way to authenticate users. You know how they work: When a user signs up for a new account, they choose a password. When they log in, they enter their password again. The server will then compare the password they entered with the password that was stored in the database.

There are 2 really important things to consider when storing passwords:

Storing passwords in plain text is awful. If someone gets access to your database, they will be able to see all of your users' passwords. If you store passwords in plain text, you are giving away your users' passwords to anyone who gets access to your database.

Password strength matters. If you allow users to choose weak passwords, they will be more likely to reuse the same password on other websites. If someone gets access to your database, they will be able to log in to your users' other accounts.
We won't be writing code to validate password strength in this course, but you get the idea: you can enforce rules in your HTTP handlers to make sure passwords are of a certain length and complexity

## Hashing
On the other hand, we will be writing code to store passwords in a way that prevents them from being read by anyone who gets access to your database. This is called hashing. Hashing is a one-way function. It takes a string as input and produces a string as output. The output string is called a hash.

# JWTS

## What Is a JWT?

A JWT is a JSON Web Token. It's a cryptographically signed JSON object that contains information about the user.

Once the token is created by the server, the data in the token can't be changed without the server knowing.

When your server issues a JWT to Bob, Bob can use that token to make requests as Bob to your API. Bob won't be able to change the token to make requests as Alice.

