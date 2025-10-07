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
app.post('/api', async (req, res, next) => {
  try {
    await handler(req, res);
  } catch (err) {
    next(err); // Pass the error to Express
  }
});

OR;

app.post('/api', (req, res, next) => {
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

## Authentication With JWTs

1. User submits username / password
2. JWT with User ID created and sent to CLIENT
3. Client sends JWT in all future logged in requests
4. On every authenticated request, server validates JWT

- It would be pretty annoying if you had to enter your username and password every time you wanted to make a request to an API.

Instead, after a user enters a username and password, our server should respond with a token (JWT) that's saved in the client's device.

The token remains valid until it expires, at which point the user will need to log in again.

- When the user wants to make a request to the API, they send the token along with the request in the HTTP headers. The server can then verify that the token is valid, which means the user is who they say they are.

## Revoking JWTs

One of the main benefits of JWTs is that they're stateless.

The server doesn't need to keep track of which users are logged in via JWT.

The server just needs to issue a JWT to a user and the user can use that JWT to authenticate themselves.

Statelessness is fast and scalable because your server doesn't need to consult a database to see if a user is currently logged in.

However, that same benefit poses a potential problem. JWTs can't be revoked.

If a user's JWT is stolen, there's no easy way to stop the JWT from being used. JWTs are just a signed string of text.

### Access Tokens

The JWTs we've been using so far are more specifically `access tokens`.

Access tokens are used to authenticate a user to a server, and they provide access to PROTECTED resources.

Access tokens are:

- Stateless
- Short-lived (15m-24h)
- Irrevocable

<b> They must be short-lived because they can't be revoked. </b>

The shorter the lifespan, the more secure they are. Trouble is, this can create a poor user experience. We don't want users to have to log in every 15 minutes.

### REFRESH TOKENS = A SOLUTION

Refresh tokens DON'T provide access to resources DIRECTLY, but they can be used to GET NEW ACCESS TOKENS.

Refresh tokens are much longer lived, and importantly, they can be revoked. They are:

- Stateful
- Long-lived (24h-60d)
- Revocable

Now we get the best of both worlds!

Our endpoints and servers that provide access to protected resources can use access tokens, which are fast, stateless, simple, and scalable.

On the other hand, refresh tokens are used to keep users logged in for longer periods of time, and they can be revoked if a user's access token is compromised.

# Cookies

HTTP cookies are one of the most talked about, but least understood, aspects of the web.

When cookies are talked about in the news, they're usually implied to simply be privacy-stealing bad guys. While cookies can certainly invade your privacy, that's not what they are.

## What Is an HTTP Cookie?

A cookie is a small piece of data that a server sends to a client.

The client then dutifully stores the cookie and sends it back to the server on subsequent requests.

Cookies can store any arbitrary data:

- A user's name or other tracking information
- A JWT (refresh and access tokens)
- Items in a shopping cart
- etc.

The server decides what to put in a cookie, and the client's job is simply to store it and send it back.

## How Do Cookies Work?

<details>
  <summary><strong>Read more about how cookies work</strong></summary>
  
Simply put, cookies work through HTTP headers.

Cookies are sent from the server to the client in the Set-Cookie header.
    
Cookies are most popular for web (browser-based) applications because browsers automatically send any cookies they have back to the server in the Cookie header.

A good use-case for cookies is to serve as a more strict and secure transport layer for JWTs within the context of a browser-based application.

For example, when using `httpOnly cookies`, you can ensure that 3rd party JavaScript that's being executed on your website can't access any cookies.

That's a lot better than storing JWTs in the browser's local storage, where it's easily accessible to any JavaScript running on the page.

</details>

# Authorization

While authentication is about verifying WHO a user is, authorization is about verifying WHAT a user is allowed to do.

For example, a hypothetical YouTuber ThePrimeagen should be allowed to edit and delete the videos on his account, and everyone should be allowed to view them. Another absolutely-not-real YouTuber TEEJ should be able to view ThePrimeagen's videos, but not edit or delete them.

Authorization logic is just the code that enforces these kinds of rules.

# Webhooks

Webhooks sound like a scary advanced concept, but they're quite simple.

A webhook is an event notification sent to your server by an external service when something happens. 

While both webhooks and cron jobs can trigger actions on your server, a key difference is that webhooks are initiated externally (by another service), whereas cron jobs are scheduled tasks that your own server runs at specific times.

The only real difference between a webhook and a typical HTTP request is that the system making the request is an automated system, not a human loading a webpage or web app. 

As such, webhook handlers must be idempotent because the system on the other side may retry the request multiple times.

## Idempo... What?

Idempotent, or "idempotence", is a fancy word that means "the same result no matter how many times you do it"

For example, your typical POST /api/chirps (create a chirp) endpoint will not be idempotent. If you send the same request twice, you'll end up with two chirps with the same information but different IDs.

Webhooks, on the other hand, should be idempotent, and it's typically easy to build them this way because the client sends some kind of "event" and usually provides its own unique ID.


## Webhooks Review

There are just a couple of things to keep in mind when building a webhook handler:

- The third-party system will probably retry requests multiple times, so your handler should be idempotent.

- Be extra careful to never "acknowledge" a webhook request unless you processed it successfully. By sending a 2XX code, you're telling the third-party system that you processed the request successfully, and they'll stop retrying it.

- When you're writing a server, you typically get to define the API. However, when you're integrating a webhook from a service like Stripe, you'll probably need to adhere to their API: they'll tell you what shape the events will be sent in.

## Are Webhooks and Websockets the Same Thing?

Nope! A websocket is a persistent connection between a client and a server. Websockets are typically used for real-time communication, like chat apps. Webhooks are a one-way communication from a third-party service to your server.


# API Keys

You may have noticed that there is an issue with our webhook handler: it's not secure!

Anyone can send a request to our webhook handler, and we'll process it. 
That means that if Chirpy users figured out our API documentation, they could simply upgrade their account without paying!

Luckily, Polka has a solution for this: API keys. 

Polka provided us with an API key, and if a request to our webhook handler doesn't use that API key, we should reject the request.

This ensures that only Polka can tell us to upgrade a user's account.

# Documentation

When you're designing a server-side API, no one is going to know how to interact with it unless you tell them. 

Are you going to force the front-end developers, mobile developers, or other back-end service teams to sift through your code and reverse engineer your API?

Of course not! You're a good person. You're going to write documentation.

## First Be Obvious, Then Document It Anyway

We've talked a lot about how your REST API should follow conventions as much as possible. That said, the conventions are not enough. 

You still need to document your endpoints. Without documentation, no one will know:

- Which resources are available
- What the path to the endpoints are
- Which HTTP methods are supported for each resource
- What the shape of the data is for each resource
etc.

One type of endpoint that's nearly impossible to interact with without documentation is a plural GET endpoint - that is, an endpoint that returns a list of resources. 
They often have different sorting, filtering, and pagination features.

