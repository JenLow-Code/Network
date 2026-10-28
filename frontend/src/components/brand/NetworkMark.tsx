import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/**
 * JenLow Network mark, traced from the logo supplied for the Discovery header.
 * Only the magenta mark is retained; the navy background is deliberately omitted.
 */
const SHAPE =
  'M250,108 237,113 224,132 224,370 219,384 206,394 189,395 173,383 169,373 167,291 150,275 126,275 112,285 106,299 106,420 103,427 95,435 86,438 71,434 62,420 62,399 56,384 47,376 36,372 16,375 4,386 0,396 0,489 3,498 12,508 23,513 41,512 57,500 62,479 70,467 78,463 95,465 106,480 108,551 117,563 126,568 145,569 162,559 169,544 171,439 187,424 202,423 210,426 220,436 224,448 225,604 237,620 261,625 277,618 288,598 288,310 299,296 316,296 326,307 329,333 339,345 348,349 362,349 371,345 382,329 382,235 378,226 368,217 358,214 344,216 329,231 327,258 323,266 312,273 295,269 288,257 287,130 273,112Z M430,5 420,16 416,29 416,494 420,507 427,516 441,523 458,523 471,517 483,498 485,439 495,427 505,423 521,425 531,433 536,443 539,480 548,491 558,496 578,495 592,484 597,473 598,439 607,427 618,423 631,426 639,434 644,458 654,471 665,476 688,473 698,464 703,452 703,364 699,354 682,341 663,341 646,355 641,380 633,390 625,394 608,391 597,374 597,302 592,291 579,281 557,280 548,285 539,296 536,306 536,375 531,385 521,393 505,395 495,391 487,383 483,373 483,25 475,10 461,1 443,0Z';
export function NetworkMark({ size = 28, color = '#171717' }: { size?: number; color?: string }) {
  return (
    <View
      accessible
      accessibilityLabel="JenLow Network"
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={size} height={size} viewBox="0 0 704 626" preserveAspectRatio="xMidYMid meet">
        <Path d={SHAPE} fill={color} />
      </Svg>
    </View>
  );
}
