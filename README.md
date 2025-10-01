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