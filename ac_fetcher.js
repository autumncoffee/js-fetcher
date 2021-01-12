const axios = require('axios');

function Wget(args) {
  return new Fetcher(args).fetch();
}

function Fetcher(args_) {
  // This is the only method here
  this.fetch = function() {
    return new Promise(fetchImpl);
  };

  const args = {...args_};

  if (!('timeout' in args)) {
    args['timeout'] = 10000;
  }

  const maxRetries = pop(args, 'retries', 5);
  const shouldRetry = pop(args, 'shouldRetry');
  const controller = pop(args, 'controller');

  let counter = 0;
  let cancelled = false;

  if (controller !== undefined) {
    const cancelTokenSource = axios.CancelToken.source();

    controller.onAbort(() => {
      cancelled = true;
      cancelTokenSource.cancel();
    });

    args.cancelToken = cancelTokenSource.token;
  }

  function rejectArg() {
    return {
      isAborted: cancelled,
    };
  }

  function fetchImpl(resolve, reject) {
    if (cancelled) {
      reject(rejectArg());
      return;
    }

    try {
      axios(args)
        .then((response) => {
          if (cancelled) {
            reject(rejectArg());
            return;
          }

          if (shouldRetry && shouldRetry(response)) {
            catchImpl(resolve, reject);

          } else {
            resolve(response);
          }
        })
        .catch(() => {
          catchImpl(resolve, reject);
        })
      ;

    } catch (e) {
      console.log(e);
      reject(rejectArg());
    }
  }

  function catchImpl(resolve, reject) {
    if (cancelled || (counter >= maxRetries)) {
      reject(rejectArg());
      return;
    }

    ++counter;

    setTimeout(() => {
      fetchImpl(resolve, reject);

    }, 1000 * counter);
  }
}

function FetcherController() {
  const self = this;
  const abort = new Promise(function(resolve, reject) {
    self.abort = resolve;
  });

  self.onAbort = function(cb) {
    abort.then(cb);
  };
}

function FetchQueue() {
  if (FetchQueue.__instance === undefined) {
    FetchQueue.__instance = new FetchQueueImpl();
  }

  return FetchQueue.__instance;
}

function FetchQueueImpl() {
  const queue = [];
  let inProg = false;

  this.push = function(args) {
    const fetcher = new Fetcher(args);
    const promise = new Promise(function(resolve, reject) {
      queue.push({ fetcher, resolve, reject });
    });

    if (inProg) {
      return promise;
    }

    impl();

    return promise;
  };

  function impl() {
    inProg = true;

    if (queue.length < 1) {
      inProg = false;
      return;
    }

    const { fetcher, resolve, reject } = queue.shift();

    function next(cb) {
      return function() {
        try {
          cb.apply(undefined, arguments);

        } catch (e) {
          console.log(e);
        }

        impl();
      };
    }

    fetcher.fetch().then(next(resolve)).catch(next(reject));
  }
}

function pop(obj, key, default_) {
  if (key in obj) {
    const out = obj[key];

    try {
      delete obj[key];

    } catch {
      obj[key] = undefined;
    }

    if (out !== undefined) {
      return out;
    }
  }

  return default_;
}

module.exports = {Wget, Fetcher, FetcherController, FetchQueue};
