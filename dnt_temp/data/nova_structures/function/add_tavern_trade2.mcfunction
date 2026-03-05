data modify entity @s Offers.Recipes prepend value {buyB:{id:"minecraft:compass",count:1},buy:{id:"minecraft:emerald",count:14},sell:{id:"minecraft:waxed_weathered_cut_copper_stairs",count:1},maxUses:1}

loot replace entity @s weapon.mainhand loot nova_structures:villagers/villager_emerald_counts

data modify entity @s Offers.Recipes[0].buy merge from entity @s equipment.mainhand

loot replace entity @s weapon.mainhand loot nova_structures:villagers/tavern_quest

data modify entity @s Offers.Recipes[0].sell merge from entity @s equipment.mainhand

tag @s add trader

