from __future__ import annotations
import random

_ADJECTIVES = [
    "amber", "arctic", "bold", "brave", "calm", "coral", "crisp",
    "daring", "dewy", "dusty", "eager", "eerie", "fierce", "frosty",
    "gentle", "golden", "happy", "hollow", "idle", "iron", "jade",
    "jolly", "keen", "lunar", "lively", "misty", "merry", "neon",
    "noble", "olive", "polar", "quick", "quiet", "rapid", "rusty",
    "sandy", "silent", "teal", "tidy", "ultra", "vast", "vivid",
    "wavy", "witty", "zesty",
]

_NOUNS = [
    "alpaca", "badger", "bison", "condor", "crane", "dingo", "dolphin",
    "eagle", "elk", "falcon", "finch", "gecko", "gorilla", "heron",
    "hyena", "ibis", "impala", "jackal", "jaguar", "kestrel", "koala",
    "lemur", "lynx", "marmot", "marten", "narwhal", "newt", "ocelot",
    "otter", "pelican", "puffin", "quail", "quetzal", "raven", "rhino",
    "salmon", "stoat", "tapir", "toucan", "urial", "viper", "vulture",
    "walrus", "weasel", "xerus", "yak", "zebra",
]


def memorable_name() -> str:
    return f"{random.randint(100, 999)}-{random.choice(_ADJECTIVES)}-{random.choice(_NOUNS)}"
