/**
 * Debug script to check which crypto symbols Alpaca supports
 * Run: npx tsx scripts/debug-crypto-symbols.ts
 */

import { AlpacaClient } from './lib/alpaca/client';
import { decrypt } from './lib/utils/crypto';

async function debugCryptoSymbols() {
  console.log('🔍 Debugging Crypto Symbol Support\n');
  console.log('=' .repeat(60));
  
  // You need to set your encrypted credentials or provide them directly
  // For now, we'll just test the crypto symbols that Alpaca typically supports
  
  const cryptoSymbols = [
    'BTC/USD',
    'ETH/USD',
    'SOL/USD',  // ⚠️ May not be supported
    'XRP/USD',  // ⚠️ May not be supported
    'DOGE/USD', // ⚠️ May not be supported
    'ADA/USD',
    'AVAX/USD',
    'DOT/USD',
    'MATIC/USD',
    'LINK/USD',
  ];

  console.log('\n📋 Testing Crypto Symbols:');
  console.log(cryptoSymbols.join(', '));
  
  console.log('\n⚠️  Note: SOL, XRP, DOGE may not be supported by Alpaca');
  console.log('Alpaca Crypto typically supports:');
  console.log('  ✅ BTC/USD, ETH/USD (always)');
  console.log('  ✅ Some major altcoins: LTC/USD, BCH/USD, LINK/USD, UNI/USD');
  console.log('  ❌ SOL, XRP, DOGE often NOT available\n');
  
  console.log('=' .repeat(60));
  console.log('\n💡 Recommendation:');
  console.log('Update crypto universe to use supported symbols:');
  console.log('  crypto_top10: ["BTC/USD", "ETH/USD", "LTC/USD", "BCH/USD", "LINK/USD", ...]');
  console.log('\n📚 Check Alpaca docs for current crypto support:');
  console.log('  https://docs.alpaca.markets/docs/about-crypto-trading\n');
}

debugCryptoSymbols();
