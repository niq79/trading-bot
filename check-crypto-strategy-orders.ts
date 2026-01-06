import { createClient } from '@supabase/supabase-js';
import { AlpacaClient } from './lib/alpaca/client';

const STRATEGY_ID = 'a4192dc0-51c8-460c-b242-888a5101b070';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get strategy info
  const { data: strategy } = await supabase
    .from('strategies')
    .select('*')
    .eq('id', STRATEGY_ID)
    .single();

  console.log('=== Crypto BTC / ETH Strategy Orders ===\n');
  console.log(`Strategy: ${strategy?.name}`);
  console.log(`User ID: ${strategy?.user_id}\n`);

  // Get all execution orders for this strategy
  const { data: orders } = await supabase
    .from('execution_orders')
    .select('*')
    .eq('strategy_id', STRATEGY_ID)
    .order('created_at', { ascending: false });

  if (!orders || orders.length === 0) {
    console.log('❌ No orders found in execution_orders table');
    return;
  }

  console.log(`Total Orders: ${orders.length}\n`);
  
  for (const order of orders) {
    const date = new Date(order.created_at).toLocaleString();
    console.log(`${date}`);
    console.log(`  ${order.side.toUpperCase()} ${order.symbol}`);
    console.log(`  Notional: $${order.notional.toFixed(2)}`);
    console.log(`  Status: ${order.status}`);
    if (order.alpaca_order_id) {
      console.log(`  Alpaca Order ID: ${order.alpaca_order_id}`);
    }
    if (order.error_message) {
      console.log(`  Error: ${order.error_message}`);
    }
    console.log('');
  }

  // Check ownership calculation
  console.log('=== Ownership Calculation ===');
  const symbolActions = new Map<string, 'buy' | 'sell'>();
  
  for (const order of orders.filter(o => o.status === 'success')) {
    if (!symbolActions.has(order.symbol)) {
      symbolActions.set(order.symbol, order.side as 'buy' | 'sell');
    }
  }

  console.log(`Successful orders: ${orders.filter(o => o.status === 'success').length}`);
  console.log('Symbol ownership (most recent action):');
  for (const [symbol, action] of symbolActions.entries()) {
    const owned = action === 'buy' ? '✓ OWNED' : '✗ NOT OWNED (sold)';
    console.log(`  ${symbol}: ${action} → ${owned}`);
  }

  // Check Alpaca positions
  console.log('\n=== Alpaca Account Positions ===');
  try {
    const alpaca = new AlpacaClient({
      apiKey: process.env.ALPACA_API_KEY!,
      apiSecret: process.env.ALPACA_API_SECRET!,
      paper: true,
    });

    const positions = await alpaca.getPositions();
    const cryptoPositions = positions.filter(p => p.symbol.includes('/'));

    if (cryptoPositions.length === 0) {
      console.log('❌ No crypto positions in account');
    } else {
      for (const pos of cryptoPositions) {
        console.log(`${pos.symbol}:`);
        console.log(`  Qty: ${pos.qty}`);
        console.log(`  Market Value: $${pos.market_value}`);
        console.log(`  Current Price: $${pos.current_price}`);
        console.log('');
      }
    }
  } catch (error: any) {
    console.log(`Error fetching Alpaca positions: ${error.message}`);
  }
}

main().catch(console.error);
