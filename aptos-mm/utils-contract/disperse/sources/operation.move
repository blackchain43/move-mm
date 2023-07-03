
module disperse::operation{
  use std::signer;
  use aptos_framework::aptos_account;
  use aptos_framework::aptos_coin::{AptosCoin};
  use aptos_std::type_info;

  const ERR_NOT_ADMIN: u64 = 0;

  public entry fun disperse<CoinType>(sender: &signer, recipients: vector<address>, amounts: vector<u64>){
    assert!(signer::address_of(sender) == @disperse, ERR_NOT_ADMIN);
    let type_name = type_info::type_name<CoinType>();
    let apt_type_name = type_info::type_name<AptosCoin>();
    let is_aptos_coin = type_name == apt_type_name;
    if(is_aptos_coin){
      aptos_account::batch_transfer(sender, recipients, amounts)
    } else {
      aptos_account::batch_transfer_coins<CoinType>(sender, recipients, amounts)
    }
  }
}
