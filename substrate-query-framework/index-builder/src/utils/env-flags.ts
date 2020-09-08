import Debug from 'debug';
const debug = Debug('index-builder:processor');

// get a number from an environment variable 
export function numberEnv(envVariable: string): number | undefined {
  if (!process.env[envVariable]) {
    debug(`Env variable ${envVariable} is not set`);
    return undefined;
  }

  let value = undefined;
  try {
    value = Number.parseInt(process.env[envVariable] || '');
  } catch (e) {
    console.error(`Cannot parse env ${envVariable} value ${process.env[envVariable] || ''} into a number`);
  }
  
  return value;
}