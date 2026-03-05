advancement revoke @s only nova_structures:boss_enchant_remover

execute if items entity @s container.* \
 *[enchantments~[{enchantments:"#nova_structures:boss_enchantments"}]] \
  run function nova_structures:boss_item_remove

execute if items entity @s container.* \
 *[stored_enchantments~[{enchantments:"#nova_structures:boss_enchantments"}]] \
  run function nova_structures:boss_book_remove