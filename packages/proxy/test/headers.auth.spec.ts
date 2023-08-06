import { DEFAULT_REGISTRY } from '@verdaccio/config';
import { HEADERS, TOKEN_BASIC, TOKEN_BEARER, constants } from '@verdaccio/core';
import { Logger } from '@verdaccio/types';
import { buildToken } from '@verdaccio/utils';

import { ProxyStorage } from '../src';

const mockDebug = jest.fn();
const mockInfo = jest.fn();
const mockHttp = jest.fn();
const mockError = jest.fn();
const mockWarn = jest.fn();

const logger = {
  debug: mockDebug,
  info: mockInfo,
  http: mockHttp,
  error: mockError,
  warn: mockWarn,
} as unknown as Logger;

function createUplink(config) {
  const defaultConfig = {
    url: DEFAULT_REGISTRY,
  };
  const mergeConfig = Object.assign({}, defaultConfig, config);
  // @ts-ignore
  return new ProxyStorage(mergeConfig, {}, logger);
}

function setHeadersNext(config: unknown = {}, headers: any = {}) {
  const uplink = createUplink(config);
  return uplink.getHeaders({ ...headers });
}

describe('setHeadersNext', () => {
  test('if set headers empty should return default headers', () => {
    const headers = setHeadersNext();
    const keys = Object.keys(headers);
    const keysExpected = [HEADERS.ACCEPT, HEADERS.ACCEPT_ENCODING, HEADERS.USER_AGENT];

    expect(keys).toEqual(keysExpected);
    expect(keys).toHaveLength(3);
  });

  test('if assigns value invalid to attribute auth', () => {
    const fnError = function () {
      setHeadersNext({
        auth: '',
      });
    };

    expect(function () {
      fnError();
    }).toThrow(Error('Auth invalid'));
  });

  test('if assigns the header authorization', () => {
    const headers = setHeadersNext(
      {},
      {
        [HEADERS.AUTHORIZATION]: buildToken(TOKEN_BASIC, 'Zm9vX2Jhcg=='),
      }
    );

    expect(Object.keys(headers)).toHaveLength(4);
    expect(headers[HEADERS.AUTHORIZATION]).toEqual(buildToken(TOKEN_BASIC, 'Zm9vX2Jhcg=='));
  });

  test('if assigns headers authorization and token the header precedes', () => {
    const headers = setHeadersNext(
      {
        auth: {
          type: TOKEN_BEARER,
          token: 'tokenBearer',
        },
      },
      {
        [HEADERS.AUTHORIZATION]: buildToken(TOKEN_BASIC, 'tokenBasic'),
      }
    );

    expect(headers[HEADERS.AUTHORIZATION]).toEqual(buildToken(TOKEN_BASIC, 'tokenBasic'));
  });

  test('set type auth basic', () => {
    const headers = setHeadersNext({
      auth: {
        type: TOKEN_BASIC,
        token: 'Zm9vX2Jhcg==',
      },
    });

    expect(Object.keys(headers)).toHaveLength(4);
    expect(headers[HEADERS.AUTHORIZATION]).toEqual(buildToken(TOKEN_BASIC, 'Zm9vX2Jhcg=='));
  });

  test('set type auth bearer', () => {
    const headers = setHeadersNext({
      auth: {
        type: TOKEN_BEARER,
        token: 'Zm9vX2Jhcf===',
      },
    });

    expect(Object.keys(headers)).toHaveLength(4);
    expect(headers[HEADERS.AUTHORIZATION]).toEqual(buildToken(TOKEN_BEARER, 'Zm9vX2Jhcf==='));
  });

  test('set auth type invalid', () => {
    const fnError = function () {
      setHeadersNext({
        auth: {
          type: 'null',
          token: 'Zm9vX2Jhcf===',
        },
      });
    };

    expect(function () {
      fnError();
    }).toThrow(Error(`Auth type 'null' not allowed`));
  });

  test('set auth with NPM_TOKEN', () => {
    process.env.NPM_TOKEN = 'myToken';
    const headers = setHeadersNext({
      auth: {
        type: TOKEN_BEARER,
      },
    });

    expect(headers[HEADERS.AUTHORIZATION]).toBe(buildToken(TOKEN_BEARER, 'myToken'));
    delete process.env.NPM_TOKEN;
  });

  test('set auth with token name and assigns in env', () => {
    process.env.NPM_TOKEN_TEST = 'myTokenTest';
    const headers = setHeadersNext({
      auth: {
        type: TOKEN_BASIC,
        token_env: 'NPM_TOKEN_TEST',
      },
    });

    expect(headers[HEADERS.AUTHORIZATION]).toBe(buildToken(TOKEN_BASIC, 'myTokenTest'));
    delete process.env.NPM_TOKEN_TEST;
  });

  test('if token not set', () => {
    const fnError = function () {
      setHeadersNext({
        auth: {
          type: TOKEN_BASIC,
        },
      });
    };

    expect(function () {
      fnError();
    }).toThrow(constants.ERROR_CODE.token_required);
  });
});
