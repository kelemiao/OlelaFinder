data modify entity @s Offers.Recipes prepend value {buyB:{id:"minecraft:compass",count:1},buy:{id:"minecraft:emerald",count:14},sell:{id:"minecraft:paper",count:1},maxUses:1}

loot replace entity @s weapon.mainhand loot nova_structures:villagers/villager_emerald_counts

data modify entity @s Offers.Recipes[0].buy merge from entity @s equipment.mainhand

loot replace entity @s weapon.mainhand loot nova_structures:villagers/tavern_quest

data modify entity @s Offers.Recipes[0].sell merge from entity @s equipment.mainhand

effect give @s regeneration 30 1

execute as @s run function nova_structures:add_tavern_trade2