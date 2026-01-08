/**
 * Diagnostic script to check crypto data availability in Alpaca
 * Run: npx tsx scripts/check-crypto-data.ts
 * 
 * This will check which crypto symbols have sufficient historical data
 * to be used in strategies (minimum 5 days required for ranking)
 */

import { createClient } from '@/lib/supabase/server';
import { AlpacaClient } from '@/lib/alpaca/client';
import { decrypt } from '@/lib/utils/crypto';

const CRYPTO_SYMBOLS = [
  'BTC/USD', 'ETH/USD', 'SOL/USD', 'DOGE/USD', 'XRP/USD',
  'AVAX/USD', 'DOT/USD', 'LINK/USD', 'UNI/USD', 'LTC/USD',
];

async function checkCryptoData() {
  console.log('🔍 Checking Crypto Data Availability in Alpaca\n');
  console.log('='.repeat(70));
  
  try {
    // Get user credentials from Supabase
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('❌ No user logged in. Please login first.');
      console.log('\nℹ️  This script needs to run in an authenticated context.');
      console.log('   Try running it from a Next.js API route or server action.');
      return;
    }

    const { data: credentials } = await supabase
      .from('alpaca_credentials')
      .select('*')
      .eq('user_id', user.id)
      .single() as { data: { api_key_encrypted: string; api_secret_encrypted: string } | null };

    if (!credentials) {
      console.error('❌ No Alpaca credentials found.');
      console.log('\nℹ️  Please connect your Alpaca account first:');
      console.log('   1. Go to Settings in the app');
      console.log('   2. Connect your Alpaca paper trading account');
      return;
    }

    // Decrypt and create Alpaca client
    const apiKey = await decrypt(credentials.api_key_encrypted);
    const apiSecret = await decrypt(credentials.api_secret_encrypted);
    const alpacaClient = new AlpacaClient({ apiKey, apiSecret, paper: true });

    console.log('\n✅ Connected to Alpaca Paper Trading Account\n');
    console.log('📊 Testing crypto symbols from crypto_top10 universe:\n');

    const results: Array<{
      symbol: string;
      hasData: boolean;
      dataPoints: number;
      error?: string;
    }> = [];

    // Check each crypto symbol
    for (const symbol of CRYPTO_SYMBOLS) {
      try {
        console.log(`   Checking ${symbol}...`);
        
        const bars = await alpacaClient.getBars(symbol, {
          timeframe: '1Day',
          limit: 30, // Try to get 30 days
        });

        const hasEnoughData = bars.length >= 5;
        
        results.push({
          symbol,
          hasData: hasEnoughData,
          dataPoints: bars.length,
        });

        if (hasEnoughData) {
          console.log(`      ✅ ${bars.length} days of data available`);
        } else {
          console.log(`      ⚠️  Only ${bars.length} days (need minimum 5)`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          symbol,
          hasData: false,
          dataPoints: 0,
          error: errorMsg,
        });
        console.log(`      ❌ Error: ${errorMsg}`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📋 SUMMARY\n');

    const available = results.filter(r => r.hasData);
    const unavailable = results.filter(r => !r.hasData);

    console.log(`✅ Available for trading: ${available.length}/${CRYPTO_SYMBOLS.length}`);
    if (available.length > 0) {
      available.forEach(r => {
        console.log(`   • ${r.symbol.padEnd(12)} - ${r.dataPoints} days`);
      });
    }

    if (unavailable.length > 0) {
      console.log(`\n❌ Insufficient data: ${unavailable.length}/${CRYPTO_SYMBOLS.length}`);
      unavailable.forEach(r => {
        if (r.error) {
          console.log(`   • ${r.symbol.padEnd(12)} - ${r.error}`);
        } else {
          console.log(`   • ${r.symbol.padEnd(12)} - Only ${r.dataPoints} days (need 5+)`);
        }
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n💡 RECOMMENDATIONS:\n');

    if (available.length < 3) {
      console.log('⚠️  Very limited crypto data available!');
      console.log('\nPossible reasons:');
      console.log('   1. New Alpaca paper trading account (data may populate over time)');
      console.log('   2. Regional restrictions on certain crypto pairs');
      console.log('   3. Temporary Alpaca API issues');
      console.log('\nSuggested actions:');
      console.log('   • Use stock universes (Mag7, Dow30, etc.) which have reliable data');
      console.log('   • Wait 24-48 hours and check again');
      console.log('   • Contact Alpaca support to verify crypto access');
      console.log('   • Use Custom Universe with only the available symbols');
    } else if (available.length < CRYPTO_SYMBOLS.length) {
      console.log('⚠️  Some crypto symbols missing data');
      console.log('\nYou can:');
      console.log('   • Create a Custom Universe with only available symbols:');
      console.log(`     ${available.map(r => r.symbol).join(', ')}`);
      console.log('   • Set "Long Positions" to match available count');
      console.log('   • Wait for more data to become available');
    } else {
      console.log('✅ All crypto symbols have sufficient data!');
      console.log('\nYour crypto strategies should work as expected.');
      console.log(`You can set "Long Positions" up to ${available.length} in your strategy.`);
    }

    console.log('\n' + '='.repeat(70));

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    console.log('\nℹ️  Make sure you have:');
    console.log('   1. Logged into the app');
    console.log('   2. Connected your Alpaca paper trading account');
    console.log('   3. Valid Alpaca API credentials');
  }
}

// Run the check
checkCryptoData().catch(console.error);
