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