import axios from 'axios';

export const BASE =
  process.env.NODE_ENV === 'development'
    ? process.env.NEXT_PUBLIC_LOCAL_BASE_URL
    : process.env.NEXT_PUBLIC_PRODUCTION_BASE_URL;

const defaultHeaders = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

export const backendFetch = ({
  endpoint,
  method = 'GET',
  body = null,
  customInit = {},
  omitToken = false,
  token = '',
}) => {
  const customHeaders = customInit.headers ? customInit.headers : {};
  if (token && !omitToken) {
    customHeaders.Authorization = `Bearer ${token}`;
  }
  const init = {
    ...customInit,
    method,
    headers: { ...defaultHeaders, ...customHeaders },
  };
  if (body) {
    init.data = JSON.stringify(body);
  }
  return axios
    .request({
      baseURL: BASE,
      url: endpoint,
      ...init,
    })
    .then((resp) => resp.data);
};
