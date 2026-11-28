import Joi from 'joi';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  MONGODB_URI: Joi.string().required(),
  JWT_ACCESS_SECRET: Joi.string().required().min(32),
  JWT_REFRESH_SECRET: Joi.string().required().min(32),
  JWT_ACCESS_EXPIRATION: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),
  GOOGLE_CLIENT_ID: Joi.string().required(),
  COOKIE_SECRET: Joi.string().optional(),
  CLOUDINARY_CLOUD_NAME: Joi.string().optional(),
  CLOUDINARY_API_KEY: Joi.string().optional(),
  CLOUDINARY_API_SECRET: Joi.string().optional(),
  CRYPTO_RPC_URL: Joi.string().uri().optional().allow(''),
  CRYPTO_CHAIN_ID: Joi.number().integer().default(11155111),
  CRYPTO_NETWORK: Joi.string().default('Sepolia'),
  CRYPTO_TOKEN_SYMBOL: Joi.string().default('USDC'),
  CRYPTO_TOKEN_ADDRESS: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .invalid(ZERO_ADDRESS)
    .optional()
    .allow(''),
  CRYPTO_TOKEN_DECIMALS: Joi.number().integer().min(0).max(18).default(6),
  CRYPTO_REQUIRED_CONFIRMATIONS: Joi.number().integer().min(1).default(3),
  PAYMENT_WALLET_ADDRESS: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .invalid(ZERO_ADDRESS)
    .optional()
    .allow(''),
});
