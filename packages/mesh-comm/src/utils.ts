export const match = (endpoint: string, pattern: string) => {
  const endpointParts = endpoint.split('/');
  const patternParts = pattern.split('/');

  if (patternParts.length > endpointParts.length) {
    return false;
  }

  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i] === '*') {
      continue;
    }
    if (patternParts[i] !== endpointParts[i]) {
      return false;
    }
  }
  return true;
};

export const assertPatternIsValid = (pattern: string) => {
  if (!pattern.match(/^(\/([a-z0-9\-_.]+|\*))+$/i)) {
    throw new Error(
      `Invalid endpoint name pattern "${pattern}". The pattern should start with "/", contain only [a-zA-Z0-9-_/] or *, and must not have a trailing "/". Examples: "/foo" or "/foo/*".`
    );
  }
};

export const assertEndpoinIsValid = (endpoint: string) => {
  if (!endpoint.match(/^(\/[a-z0-9\-_.]+)+$/i)) {
    throw new Error(
      `Invalid endpoint "${endpoint}". The endpoint should start with "/", contain only [a-zA-Z0-9-_/], and must not have a trailing "/". Examples: "/foo" or "/foo/bar".`
    );
  }
};

