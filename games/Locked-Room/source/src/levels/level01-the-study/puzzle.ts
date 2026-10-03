import type { Step } from '../../engine/PuzzleState';
export const puzzleGraph: Step[] = [
    {id:'latch',requirements:['latch'],unlock:'drawerFree'},
    {id:'drawer',requirements:['drawer'],unlock:'suppliesFound'},
    {id:'match',requirements:['match'],unlock:'flameReady'},
    {id:'candle',requirements:['candle'],unlock:'warmthReady'},
    {id:'heat',requirements:['heat'],unlock:'candleClue'},
    {id:'moon',requirements:['moon'],unlock:'moonClue'},
    {id:'bird',requirements:['bird'],unlock:'birdClue'},
    {id:'hooks',requirements:['hooks'],unlock:'keyClue'},
    {id:'painting',requirements:['painting'],unlock:'safeFound'},
    {id:'safe',requirements:['safe'],unlock:'safeOpen'},
    {id:'key',requirements:['key'],unlock:'exitReady'},
    {id:'escape',requirements:['escape'],unlock:'complete'},
  ];
export const hints: Record<string,string[]> = {
    latch:['Some things resist a hurried hand.','The desk drawer is caught from below.','Inspect underneath the desk, then release the brass latch.'],
    drawer:['An old desk keeps useful things.','The drawer is free now.','Pull the drawer open. Take the matchbox and the letter.'],
    match:['A little warmth may help.','The matchbox has a rough striking edge.','Select the matchbox in your inventory, then strike a match.'],
    candle:['One flame can become many.','The candelabra has never been lit.','Select your lit match and use it on the candelabra.'],
    heat:['The light remembers what the ink forgets.','Elias’s letter may be hiding heat-sensitive ink.','Inspect the letter and hold it near the lit candles. The revealed candle clue is II.'],
    moon:['There are things only darkness lets you see.','The painting’s back suggests looking upward with the lamp off.','Switch off the desk lamp and inspect the ceiling mural. Its stars form 9.'],
    bird:['Even a caged bird can tell a story.','The music box waits for someone to wind it.','Open the cage and wind the box. Count each chime or bird bob: seven.'],
    hooks:['Absence leaves its own mark.','One numbered hook on the wall has no key.','Inspect the key board. Hook 4 is empty, with the same key-shaped dust outline as the safe symbol.'],
    painting:['Something on the wall is not quite level.','The moon painting looks crooked. Try straightening it.','Straighten the painting, then slide it aside to expose the safe.'],
    safe:['Four memories, in the order of their symbols.','Moon, candle, missing key, singing bird.','Set the four dials to 9 · 2 · 4 · 7, then turn the safe handle.'],
    key:['The safe held something more useful than money.','Look inside the open safe.','Take the iron key. The sealed envelope belongs to another room.'],
    escape:['One last lock stands between you and the morning.','The iron key fits the oak door.','Select the iron key, then use it on the oak door.'],
  };
