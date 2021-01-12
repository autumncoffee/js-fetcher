const {FetchQueue} = require('./');

const requestCount = 3;
const expected = [
  'schedule 0',
  'schedule 1',
  'schedule 2',
  'response 0',
  'response 1',
  'response 2',
];

function assert(tag) {
  const expectedTag = expected.shift();

  if (tag != expectedTag) {
    throw new Error(`Failed: "${tag}" != "${expectedTag}"`);
  }

  if (expected.length == 0) {
    console.log('OK');
  }
}

for (let i = 0; i < requestCount; ++i) {
  assert(`schedule ${i}`);

  FetchQueue().push({
    method: 'get',
    url: 'https://github.com/',

  }).then(function(response) {
    assert(`response ${i}`);

  }).catch(function() {
    throw new Error('Request failed');
  });
}
