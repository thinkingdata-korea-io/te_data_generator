# 게임 서비스 텍소노미 베스트 프랙티스

- **온보딩 흐름**
  - `game_app_start`, `tutorial_step_view`, `tutorial_complete`
  - 속성 예: `step_id`, `failure_reason`, `assist_used`

- **전투/콘텐츠 진행**
  - `mission_enter`, `mission_clear`, `mission_fail`
  - 속성 예: `mission_type`, `difficulty`, `clear_time`

- **상점/경제**
  - `shop_view`, `currency_purchase`, `gacha_open`
  - 속성 예: `currency_type`, `price_tier`, `item_rarity`

- **커뮤니티**
  - `guild_join`, `chat_send`, `friend_invite`
  - 속성 예: `guild_level`, `message_length`, `invite_channel`

이 구조는 DAU 5만, ARPPU 15달러 규모의 게임에서 실제로 사용된 예시이며, 이벤트/속성/퍼널을 설계할 때 참고할 수 있습니다.
