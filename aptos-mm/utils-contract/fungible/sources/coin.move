module fungible::coin{
  use std::signer;
  use std::string::utf8;
  use aptos_framework::coin;
  use aptos_std::math64;

  const TOTAL_SUPPLY: u64 = 1000000000;
  const DECIMALS: u8 = 6;
  const ERR_COIN_INITIALIZED: u64 = 1;

  struct FLC{}

  struct CoinCapabilities has key {
    burn_capability: coin::BurnCapability<FLC>,
  }


  fun init_module(sender: &signer) {
    let sender_address = signer::address_of(sender);
    let (burn_cap, freeze_cap, mint_cap) =  coin::initialize<FLC>(
      sender,
      utf8(b"Florentino Coin"),
      utf8(b"FLC"),
      DECIMALS,
      true,
    );
    coin::register<FLC>(sender);
    let total_amount_mint = TOTAL_SUPPLY * math64::pow(10, (DECIMALS as u64));
    let coins_minted = coin::mint(total_amount_mint, &mint_cap);
    coin::deposit(sender_address, coins_minted);
    coin::destroy_mint_cap(mint_cap);
    coin::destroy_freeze_cap(freeze_cap);
    move_to(
      sender,
      CoinCapabilities{
      burn_capability: burn_cap,
    }); 
  }
  public entry fun register(user: signer) {
    coin::register<FLC>(&user);
  }

  public entry fun burn(user: &signer, amount: u64) acquires CoinCapabilities {
    assert!(coin::is_coin_initialized<FLC>(), ERR_COIN_INITIALIZED);

    let coin = coin::withdraw<FLC>(user, amount);
    let caps = borrow_global<CoinCapabilities>(@fungible);
    coin::burn(coin, &caps.burn_capability);
  }
}