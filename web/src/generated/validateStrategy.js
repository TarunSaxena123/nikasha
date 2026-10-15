// Generated from specs/contracts by web/scripts/codegen.mjs. Do not edit by hand.
/* eslint-disable */
// @ts-nocheck

export const validate = validate20;
export default validate20;
const schema31 = {"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"https://nikasha.local/contracts/strategy.schema.json","title":"Strategy","description":"Internal strategy format. Never shown to users (constitution §4). Structural rules live here; rules JSON Schema cannot express are in strategy-rules.md (SEM-xx) and are enforced identically by the web app and the engine. Mandatory inputs (product.md §6.1) are the required top-level fields. Every advanced option (product.md §6.2) is OFF when absent and has no default.","$comment":"Advanced options and where they live: SL cap → advanced.sl_cap_pts; trigger-candle SL → exit.stop_loss.type TRIGGER_CANDLE; R:R target → exit.target.type RR; trail to cost → advanced.trail_to_cost_at_r; exit after N candles → advanced.exit_after_candles; VIX sizing → advanced.vix_sizing; entry/no-entry windows → advanced.entry_windows / advanced.no_entry_windows; expiry-day cutoff → advanced.expiry_day_cutoff; daily limits → advanced.daily; 1–4 legs → legs (more than one leg); strike by delta/premium → legs[].strike.method DELTA / PREMIUM.","type":"object","additionalProperties":false,"required":["schema_version","underlying","timeframe_min","holding","position","indicators","legs","entry","exit"],"properties":{"schema_version":{"const":"1.0"},"name":{"type":"string","minLength":1,"maxLength":120},"origin":{"description":"Which entry path produced this strategy. Informational only; does not change evaluation.","enum":["TEMPLATE","BUILDER","UPLOAD"]},"template_id":{"type":"string","pattern":"^[a-z0-9-]{1,40}$"},"underlying":{"description":"Instrument symbol from the instrument registry (mandatory input 1).","type":"string","pattern":"^[A-Z0-9_]{2,20}$"},"timeframe_min":{"description":"Candle timeframe in minutes (mandatory input 7). Also limited by the instrument profile's allowed_timeframes_min.","enum":[1,3,5,15,30,60,240]},"holding":{"description":"Mandatory input 8. INTRADAY positions are squared off at the profile's intraday_squareoff time.","enum":["INTRADAY","POSITIONAL"]},"position":{"description":"Mandatory inputs 9 and 10. Applied uniformly to every trade in the backtest.","type":"object","additionalProperties":false,"required":["lots","lot_size"],"properties":{"lots":{"type":"integer","minimum":1,"maximum":1000},"lot_size":{"type":"integer","minimum":1,"maximum":100000}}},"indicators":{"description":"Indicator instances referenced by conditions, keyed by an id such as ema9. May be empty for fixed-time strategies.","type":"object","propertyNames":{"pattern":"^[a-z][a-z0-9_]{0,31}$"},"additionalProperties":{"$ref":"#/$defs/Indicator"},"maxProperties":20},"legs":{"description":"Mandatory inputs 2–6 (action, option type, moneyness, distance, expiry). More than one leg is an advanced option.","type":"array","minItems":1,"maxItems":4,"items":{"$ref":"#/$defs/Leg"}},"entry":{"$ref":"#/$defs/Entry"},"exit":{"$ref":"#/$defs/Exit"},"advanced":{"$ref":"#/$defs/Advanced"}},"$defs":{"Time":{"description":"Clock time HH:MM, IST.","type":"string","pattern":"^([01][0-9]|2[0-3]):[0-5][0-9]$"},"TimeWindow":{"type":"object","additionalProperties":false,"required":["from","to"],"properties":{"from":{"$ref":"#/$defs/Time"},"to":{"$ref":"#/$defs/Time"}}},"IndicatorId":{"type":"string","pattern":"^[a-z][a-z0-9_]{0,31}$"},"PriceField":{"enum":["open","high","low","close"]},"Indicator":{"oneOf":[{"title":"Moving average (EMA or SMA)","type":"object","additionalProperties":false,"required":["type","period","source"],"properties":{"type":{"enum":["EMA","SMA"]},"period":{"type":"integer","minimum":1,"maximum":500},"source":{"$ref":"#/$defs/PriceField"}}},{"title":"RSI or ADX","description":"RSI outputs: value. ADX outputs: value (ADX), plus_di, minus_di.","type":"object","additionalProperties":false,"required":["type","period"],"properties":{"type":{"enum":["RSI","ADX"]},"period":{"type":"integer","minimum":2,"maximum":200}}},{"title":"Supertrend","description":"Outputs: value (the Supertrend line) and direction (up = green, down = red), used by state/turns conditions.","type":"object","additionalProperties":false,"required":["type","period","multiplier"],"properties":{"type":{"const":"SUPERTREND"},"period":{"type":"integer","minimum":1,"maximum":200},"multiplier":{"type":"number","exclusiveMinimum":0,"maximum":10}}},{"title":"MACD","description":"Outputs: value (MACD line), signal, hist.","type":"object","additionalProperties":false,"required":["type","fast","slow","signal"],"properties":{"type":{"const":"MACD"},"fast":{"type":"integer","minimum":1,"maximum":200},"slow":{"type":"integer","minimum":2,"maximum":400},"signal":{"type":"integer","minimum":1,"maximum":200}}},{"title":"Bollinger Bands","description":"Outputs: upper, middle, lower.","type":"object","additionalProperties":false,"required":["type","period","stddev","source"],"properties":{"type":{"const":"BBANDS"},"period":{"type":"integer","minimum":2,"maximum":500},"stddev":{"type":"number","exclusiveMinimum":0,"maximum":5},"source":{"$ref":"#/$defs/PriceField"}}}]},"Offset":{"description":"Shifts an operand, e.g. EMA 21 + 10 points, to express thresholds such as 'closes decisively above'.","oneOf":[{"type":"object","additionalProperties":false,"required":["pts"],"properties":{"pts":{"type":"number","minimum":-100000,"maximum":100000}}},{"type":"object","additionalProperties":false,"required":["pct"],"properties":{"pct":{"type":"number","minimum":-100,"maximum":100}}}]},"Operand":{"oneOf":[{"title":"Indicator output","type":"object","additionalProperties":false,"required":["ind","output"],"properties":{"ind":{"$ref":"#/$defs/IndicatorId"},"output":{"enum":["value","signal","hist","upper","middle","lower","plus_di","minus_di"]},"offset":{"$ref":"#/$defs/Offset"}}},{"title":"Underlying candle price","type":"object","additionalProperties":false,"required":["price"],"properties":{"price":{"$ref":"#/$defs/PriceField"},"offset":{"$ref":"#/$defs/Offset"}}},{"title":"Volatility index value on the candle","type":"object","additionalProperties":false,"required":["vix"],"properties":{"vix":{"enum":["open","close"]}}},{"title":"Constant number","type":"object","additionalProperties":false,"required":["const"],"properties":{"const":{"type":"number"}}}]},"Condition":{"description":"Evaluated on each candle close. Groups nest (max depth 4, SEM-15).","oneOf":[{"$ref":"#/$defs/AllGroup"},{"$ref":"#/$defs/AnyGroup"},{"$ref":"#/$defs/Compare"},{"$ref":"#/$defs/Cross"},{"$ref":"#/$defs/State"},{"$ref":"#/$defs/Turns"},{"$ref":"#/$defs/Slope"}]},"AllGroup":{"description":"True when every condition is true (AND).","type":"object","additionalProperties":false,"required":["type","conditions"],"properties":{"type":{"const":"all"},"conditions":{"type":"array","minItems":1,"maxItems":20,"items":{"$ref":"#/$defs/Condition"}}}},"AnyGroup":{"description":"True when at least one condition is true (OR). Only used where the user's rule says 'or' (product.md §6.4).","type":"object","additionalProperties":false,"required":["type","conditions"],"properties":{"type":{"const":"any"},"conditions":{"type":"array","minItems":2,"maxItems":20,"items":{"$ref":"#/$defs/Condition"}}}},"Compare":{"type":"object","additionalProperties":false,"required":["type","left","op","right"],"properties":{"type":{"const":"compare"},"left":{"$ref":"#/$defs/Operand"},"op":{"enum":["gt","gte","lt","lte"]},"right":{"$ref":"#/$defs/Operand"}}},"Cross":{"description":"left crosses above/below right on this candle (was on the other side, or equal, on the previous candle).","type":"object","additionalProperties":false,"required":["type","left","direction","right"],"properties":{"type":{"const":"cross"},"left":{"$ref":"#/$defs/Operand"},"direction":{"enum":["above","below"]},"right":{"$ref":"#/$defs/Operand"}}},"State":{"description":"A direction indicator is currently up/down (e.g. Supertrend is green), on any candle while it holds.","type":"object","additionalProperties":false,"required":["type","ind","is"],"properties":{"type":{"const":"state"},"ind":{"$ref":"#/$defs/IndicatorId"},"is":{"enum":["up","down"]}}},"Turns":{"description":"A direction indicator flips to up/down on this candle only (e.g. Supertrend turns green).","type":"object","additionalProperties":false,"required":["type","ind","to"],"properties":{"type":{"const":"turns"},"ind":{"$ref":"#/$defs/IndicatorId"},"to":{"enum":["up","down"]}}},"Slope":{"description":"Operand is higher (up) / lower (down) now than lookback candles ago.","type":"object","additionalProperties":false,"required":["type","operand","direction","lookback"],"properties":{"type":{"const":"slope"},"operand":{"$ref":"#/$defs/Operand"},"direction":{"enum":["up","down"]},"lookback":{"type":"integer","minimum":1,"maximum":50}}},"Leg":{"type":"object","additionalProperties":false,"required":["action","option_type","expiry","strike"],"properties":{"action":{"description":"Mandatory input 2.","enum":["BUY","SELL"]},"option_type":{"description":"Mandatory input 3. SIGNAL = CE when the CE entry condition is met, PE when the PE entry condition is met (option type 'both').","enum":["CE","PE","SIGNAL"]},"expiry":{"description":"Mandatory input 6.","enum":["CURRENT_WEEKLY","NEXT_WEEKLY","MONTHLY"]},"strike":{"$ref":"#/$defs/StrikeSelection"}}},"StrikeSelection":{"oneOf":[{"title":"By moneyness (mandatory inputs 4 and 5)","type":"object","additionalProperties":false,"required":["method","moneyness","distance_pts"],"properties":{"method":{"const":"MONEYNESS"},"moneyness":{"enum":["ATM","ITM","OTM"]},"distance_pts":{"type":"number","minimum":0,"maximum":100000}}},{"title":"By delta (advanced)","type":"object","additionalProperties":false,"required":["method","target_delta"],"properties":{"method":{"const":"DELTA"},"target_delta":{"type":"number","exclusiveMinimum":0,"exclusiveMaximum":1}}},{"title":"By premium (advanced)","type":"object","additionalProperties":false,"required":["method","target_premium"],"properties":{"method":{"const":"PREMIUM"},"target_premium":{"type":"number","exclusiveMinimum":0}}}]},"Entry":{"description":"Mandatory input 11. An entry happens only when the entire strategy is satisfied (product.md §7.2). Triggers present together must all hold (at_time AND the side's conditions).","type":"object","additionalProperties":false,"minProperties":1,"properties":{"at_time":{"description":"Fixed entry time; with conditions it is an additional requirement.","$ref":"#/$defs/Time"},"ce":{"description":"Conditions that open CE (and SIGNAL-as-CE) legs.","$ref":"#/$defs/Condition"},"pe":{"description":"Conditions that open PE (and SIGNAL-as-PE) legs.","$ref":"#/$defs/Condition"},"all_legs":{"description":"Conditions that open all legs together (multi-leg, non-directional).","$ref":"#/$defs/Condition"}}},"Exit":{"description":"Mandatory inputs 12 and 13. INTRADAY: the square-off time is the time exit. POSITIONAL: needs target, time_exit, hold_to_expiry or advanced.exit_after_candles, chosen by the user (SEM-07). A position still open on its expiry day is settled at intrinsic value. For multi-leg strategies, stop_loss and target apply to the combined position.","type":"object","additionalProperties":false,"required":["stop_loss"],"properties":{"stop_loss":{"oneOf":[{"title":"Percent of entry premium","type":"object","additionalProperties":false,"required":["type","value"],"properties":{"type":{"const":"PCT_PREMIUM"},"value":{"type":"number","exclusiveMinimum":0,"maximum":1000}}},{"title":"Premium points","type":"object","additionalProperties":false,"required":["type","value"],"properties":{"type":{"const":"POINTS"},"value":{"type":"number","exclusiveMinimum":0}}},{"title":"Trigger candle (advanced): low (bought) / high (sold) of the trigger candle on the modelled option premium","type":"object","additionalProperties":false,"required":["type"],"properties":{"type":{"const":"TRIGGER_CANDLE"}}}]},"target":{"oneOf":[{"type":"object","additionalProperties":false,"required":["type","value"],"properties":{"type":{"enum":["PCT_PREMIUM","POINTS"]},"value":{"type":"number","exclusiveMinimum":0}}},{"title":"Risk-reward (advanced): target distance = value × stop distance","type":"object","additionalProperties":false,"required":["type","value"],"properties":{"type":{"const":"RR"},"value":{"type":"number","exclusiveMinimum":0,"maximum":20}}}]},"time_exit":{"type":"object","additionalProperties":false,"required":["at","on"],"properties":{"at":{"$ref":"#/$defs/Time"},"on":{"enum":["ENTRY_DAY","EXPIRY_DAY"]}}},"hold_to_expiry":{"description":"Positional only, chosen by the user: hold until expiry and settle at intrinsic value. Only the value true is meaningful; absence means not chosen.","const":true}}},"Advanced":{"description":"Every property is OFF when absent. No property has a default (constitution §3).","type":"object","additionalProperties":false,"properties":{"sl_cap_pts":{"description":"Maximum stop distance in premium points.","type":"number","exclusiveMinimum":0},"trail_to_cost_at_r":{"description":"Move stop to entry price once profit reaches this multiple of the initial risk.","type":"number","exclusiveMinimum":0,"maximum":20},"exit_after_candles":{"description":"Exit if neither stop nor target is hit within N candles after entry.","type":"integer","minimum":1,"maximum":500},"vix_sizing":{"description":"Position size per VIX band, as % of the set lots. Bands must cover all VIX values without gaps or overlaps (SEM-12). Result rounded down, minimum 1 lot.","type":"object","additionalProperties":false,"required":["measured_at","bands"],"properties":{"measured_at":{"description":"DAY_OPEN = the day's first VIX value (09:15; used for 'pre-market' rules). ENTRY = VIX at the entry minute.","enum":["DAY_OPEN","ENTRY"]},"bands":{"type":"array","minItems":1,"maxItems":6,"items":{"type":"object","additionalProperties":false,"required":["size_pct"],"properties":{"vix_from":{"description":"Inclusive lower edge; absent = no lower edge.","type":"number","minimum":0},"vix_to":{"description":"Exclusive upper edge; absent = no upper edge.","type":"number","exclusiveMinimum":0},"size_pct":{"type":"number","exclusiveMinimum":0,"maximum":1000}}}}}},"entry_windows":{"description":"New entries only inside these windows.","type":"array","minItems":1,"maxItems":6,"items":{"$ref":"#/$defs/TimeWindow"}},"no_entry_windows":{"description":"No new entries inside these windows.","type":"array","minItems":1,"maxItems":6,"items":{"$ref":"#/$defs/TimeWindow"}},"expiry_day_cutoff":{"description":"No new entries at or after this time on the traded contract's expiry day.","$ref":"#/$defs/Time"},"daily":{"type":"object","additionalProperties":false,"minProperties":1,"properties":{"max_trades":{"type":"integer","minimum":1,"maximum":100},"stop_after_sl_hits":{"type":"integer","minimum":1,"maximum":100},"max_daily_loss_rupees":{"type":"number","exclusiveMinimum":0}}}}}},"examples":[{"schema_version":"1.0","name":"Simple Trend Follower","origin":"TEMPLATE","template_id":"simple-trend-follower","underlying":"NIFTY50","timeframe_min":15,"holding":"INTRADAY","position":{"lots":1,"lot_size":65},"indicators":{"ema9":{"type":"EMA","period":9,"source":"close"},"ema21":{"type":"EMA","period":21,"source":"close"}},"legs":[{"action":"BUY","option_type":"SIGNAL","expiry":"CURRENT_WEEKLY","strike":{"method":"MONEYNESS","moneyness":"ATM","distance_pts":0}}],"entry":{"ce":{"type":"cross","left":{"ind":"ema9","output":"value"},"direction":"above","right":{"ind":"ema21","output":"value"}},"pe":{"type":"cross","left":{"ind":"ema9","output":"value"},"direction":"below","right":{"ind":"ema21","output":"value"}}},"exit":{"stop_loss":{"type":"PCT_PREMIUM","value":30},"target":{"type":"PCT_PREMIUM","value":50}},"advanced":{"entry_windows":[{"from":"09:30","to":"14:30"}],"daily":{"max_trades":2}}},{"schema_version":"1.0","name":"Nifty 15-min weekly option buying (sample, with example answers to its vague rules)","origin":"UPLOAD","underlying":"NIFTY50","timeframe_min":15,"holding":"INTRADAY","position":{"lots":2,"lot_size":65},"indicators":{"st":{"type":"SUPERTREND","period":10,"multiplier":2},"ema9":{"type":"EMA","period":9,"source":"close"},"ema21":{"type":"EMA","period":21,"source":"close"},"rsi14":{"type":"RSI","period":14},"adx14":{"type":"ADX","period":14}},"legs":[{"action":"BUY","option_type":"SIGNAL","expiry":"CURRENT_WEEKLY","strike":{"method":"MONEYNESS","moneyness":"ITM","distance_pts":100}}],"entry":{"ce":{"type":"all","conditions":[{"type":"turns","ind":"st","to":"up"},{"type":"compare","left":{"ind":"ema9","output":"value"},"op":"gt","right":{"ind":"ema21","output":"value"}},{"type":"compare","left":{"price":"close"},"op":"gt","right":{"ind":"ema9","output":"value","offset":{"pts":10}}},{"type":"compare","left":{"price":"close"},"op":"gt","right":{"ind":"ema21","output":"value","offset":{"pts":10}}},{"type":"compare","left":{"ind":"rsi14","output":"value"},"op":"gt","right":{"const":55}},{"type":"any","conditions":[{"type":"all","conditions":[{"type":"compare","left":{"ind":"adx14","output":"value"},"op":"gt","right":{"const":20}},{"type":"slope","operand":{"ind":"adx14","output":"value"},"direction":"up","lookback":1}]},{"type":"compare","left":{"ind":"adx14","output":"value"},"op":"gt","right":{"const":30}}]}]},"pe":{"type":"all","conditions":[{"type":"turns","ind":"st","to":"down"},{"type":"compare","left":{"ind":"ema9","output":"value"},"op":"lt","right":{"ind":"ema21","output":"value"}},{"type":"compare","left":{"price":"close"},"op":"lt","right":{"ind":"ema9","output":"value","offset":{"pts":-10}}},{"type":"compare","left":{"price":"close"},"op":"lt","right":{"ind":"ema21","output":"value","offset":{"pts":-10}}},{"type":"compare","left":{"ind":"rsi14","output":"value"},"op":"lt","right":{"const":45}},{"type":"any","conditions":[{"type":"all","conditions":[{"type":"compare","left":{"ind":"adx14","output":"value"},"op":"gt","right":{"const":20}},{"type":"slope","operand":{"ind":"adx14","output":"value"},"direction":"up","lookback":1}]},{"type":"compare","left":{"ind":"adx14","output":"value"},"op":"gt","right":{"const":30}}]}]}},"exit":{"stop_loss":{"type":"TRIGGER_CANDLE"},"target":{"type":"RR","value":1.5}},"advanced":{"sl_cap_pts":30,"trail_to_cost_at_r":1,"exit_after_candles":4,"vix_sizing":{"measured_at":"DAY_OPEN","bands":[{"vix_to":12,"size_pct":50},{"vix_from":12,"vix_to":18,"size_pct":100},{"vix_from":18,"size_pct":50}]},"no_entry_windows":[{"from":"11:00","to":"13:30"}],"expiry_day_cutoff":"12:00","daily":{"max_trades":2,"stop_after_sl_hits":2}}},{"schema_version":"1.0","name":"Simple short straddle","origin":"TEMPLATE","template_id":"simple-short-straddle","underlying":"NIFTY50","timeframe_min":5,"holding":"INTRADAY","position":{"lots":1,"lot_size":65},"indicators":{},"legs":[{"action":"SELL","option_type":"CE","expiry":"CURRENT_WEEKLY","strike":{"method":"MONEYNESS","moneyness":"ATM","distance_pts":0}},{"action":"SELL","option_type":"PE","expiry":"CURRENT_WEEKLY","strike":{"method":"MONEYNESS","moneyness":"ATM","distance_pts":0}}],"entry":{"at_time":"09:20"},"exit":{"stop_loss":{"type":"PCT_PREMIUM","value":30}}}]};
const func1 = Object.prototype.hasOwnProperty;
const func2 = (function ucs2length(str) { const len = str.length; let length = 0; let pos = 0; let value; while (pos < len) { length++; value = str.charCodeAt(pos++); if (value >= 0xd800 && value <= 0xdbff && pos < len) { value = str.charCodeAt(pos); if ((value & 0xfc00) === 0xdc00) pos++; } } return length; });
const pattern4 = new RegExp("^[a-z0-9-]{1,40}$", "u");
const pattern5 = new RegExp("^[A-Z0-9_]{2,20}$", "u");
const pattern6 = new RegExp("^[a-z][a-z0-9_]{0,31}$", "u");
const schema32 = {"oneOf":[{"title":"Moving average (EMA or SMA)","type":"object","additionalProperties":false,"required":["type","period","source"],"properties":{"type":{"enum":["EMA","SMA"]},"period":{"type":"integer","minimum":1,"maximum":500},"source":{"$ref":"#/$defs/PriceField"}}},{"title":"RSI or ADX","description":"RSI outputs: value. ADX outputs: value (ADX), plus_di, minus_di.","type":"object","additionalProperties":false,"required":["type","period"],"properties":{"type":{"enum":["RSI","ADX"]},"period":{"type":"integer","minimum":2,"maximum":200}}},{"title":"Supertrend","description":"Outputs: value (the Supertrend line) and direction (up = green, down = red), used by state/turns conditions.","type":"object","additionalProperties":false,"required":["type","period","multiplier"],"properties":{"type":{"const":"SUPERTREND"},"period":{"type":"integer","minimum":1,"maximum":200},"multiplier":{"type":"number","exclusiveMinimum":0,"maximum":10}}},{"title":"MACD","description":"Outputs: value (MACD line), signal, hist.","type":"object","additionalProperties":false,"required":["type","fast","slow","signal"],"properties":{"type":{"const":"MACD"},"fast":{"type":"integer","minimum":1,"maximum":200},"slow":{"type":"integer","minimum":2,"maximum":400},"signal":{"type":"integer","minimum":1,"maximum":200}}},{"title":"Bollinger Bands","description":"Outputs: upper, middle, lower.","type":"object","additionalProperties":false,"required":["type","period","stddev","source"],"properties":{"type":{"const":"BBANDS"},"period":{"type":"integer","minimum":2,"maximum":500},"stddev":{"type":"number","exclusiveMinimum":0,"maximum":5},"source":{"$ref":"#/$defs/PriceField"}}}]};
const schema33 = {"enum":["open","high","low","close"]};

function validate21(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate21.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs0 = errors;
let valid0 = false;
let passing0 = null;
const _errs1 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.type === undefined){
const err0 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.period === undefined){
const err1 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "period"},message:"must have required property '"+"period"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.source === undefined){
const err2 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "source"},message:"must have required property '"+"source"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
for(const key0 in data){
if(!(((key0 === "type") || (key0 === "period")) || (key0 === "source"))){
const err3 = {instancePath,schemaPath:"#/oneOf/0/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
if(data.type !== undefined){
let data0 = data.type;
if(!((data0 === "EMA") || (data0 === "SMA"))){
const err4 = {instancePath:instancePath+"/type",schemaPath:"#/oneOf/0/properties/type/enum",keyword:"enum",params:{allowedValues: schema32.oneOf[0].properties.type.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
if(data.period !== undefined){
let data1 = data.period;
if(!((typeof data1 == "number") && (!(data1 % 1) && !isNaN(data1)))){
const err5 = {instancePath:instancePath+"/period",schemaPath:"#/oneOf/0/properties/period/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(typeof data1 == "number"){
if(data1 > 500 || isNaN(data1)){
const err6 = {instancePath:instancePath+"/period",schemaPath:"#/oneOf/0/properties/period/maximum",keyword:"maximum",params:{comparison: "<=", limit: 500},message:"must be <= 500"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
if(data1 < 1 || isNaN(data1)){
const err7 = {instancePath:instancePath+"/period",schemaPath:"#/oneOf/0/properties/period/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
}
if(data.source !== undefined){
let data2 = data.source;
if(!((((data2 === "open") || (data2 === "high")) || (data2 === "low")) || (data2 === "close"))){
const err8 = {instancePath:instancePath+"/source",schemaPath:"#/$defs/PriceField/enum",keyword:"enum",params:{allowedValues: schema33.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
}
else {
const err9 = {instancePath,schemaPath:"#/oneOf/0/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
var _valid0 = _errs1 === errors;
if(_valid0){
valid0 = true;
passing0 = 0;
var props0 = true;
}
const _errs9 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.type === undefined){
const err10 = {instancePath,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
if(data.period === undefined){
const err11 = {instancePath,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty: "period"},message:"must have required property '"+"period"+"'"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
for(const key1 in data){
if(!((key1 === "type") || (key1 === "period"))){
const err12 = {instancePath,schemaPath:"#/oneOf/1/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
if(data.type !== undefined){
let data3 = data.type;
if(!((data3 === "RSI") || (data3 === "ADX"))){
const err13 = {instancePath:instancePath+"/type",schemaPath:"#/oneOf/1/properties/type/enum",keyword:"enum",params:{allowedValues: schema32.oneOf[1].properties.type.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
if(data.period !== undefined){
let data4 = data.period;
if(!((typeof data4 == "number") && (!(data4 % 1) && !isNaN(data4)))){
const err14 = {instancePath:instancePath+"/period",schemaPath:"#/oneOf/1/properties/period/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
if(typeof data4 == "number"){
if(data4 > 200 || isNaN(data4)){
const err15 = {instancePath:instancePath+"/period",schemaPath:"#/oneOf/1/properties/period/maximum",keyword:"maximum",params:{comparison: "<=", limit: 200},message:"must be <= 200"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
if(data4 < 2 || isNaN(data4)){
const err16 = {instancePath:instancePath+"/period",schemaPath:"#/oneOf/1/properties/period/minimum",keyword:"minimum",params:{comparison: ">=", limit: 2},message:"must be >= 2"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
}
}
else {
const err17 = {instancePath,schemaPath:"#/oneOf/1/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
var _valid0 = _errs9 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid0 = true;
passing0 = 1;
if(props0 !== true){
props0 = true;
}
}
const _errs15 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.type === undefined){
const err18 = {instancePath,schemaPath:"#/oneOf/2/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
if(data.period === undefined){
const err19 = {instancePath,schemaPath:"#/oneOf/2/required",keyword:"required",params:{missingProperty: "period"},message:"must have required property '"+"period"+"'"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
if(data.multiplier === undefined){
const err20 = {instancePath,schemaPath:"#/oneOf/2/required",keyword:"required",params:{missingProperty: "multiplier"},message:"must have required property '"+"multiplier"+"'"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
for(const key2 in data){
if(!(((key2 === "type") || (key2 === "period")) || (key2 === "multiplier"))){
const err21 = {instancePath,schemaPath:"#/oneOf/2/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key2},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
}
if(data.type !== undefined){
if("SUPERTREND" !== data.type){
const err22 = {instancePath:instancePath+"/type",schemaPath:"#/oneOf/2/properties/type/const",keyword:"const",params:{allowedValue: "SUPERTREND"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
}
if(data.period !== undefined){
let data6 = data.period;
if(!((typeof data6 == "number") && (!(data6 % 1) && !isNaN(data6)))){
const err23 = {instancePath:instancePath+"/period",schemaPath:"#/oneOf/2/properties/period/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
if(typeof data6 == "number"){
if(data6 > 200 || isNaN(data6)){
const err24 = {instancePath:instancePath+"/period",schemaPath:"#/oneOf/2/properties/period/maximum",keyword:"maximum",params:{comparison: "<=", limit: 200},message:"must be <= 200"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
if(data6 < 1 || isNaN(data6)){
const err25 = {instancePath:instancePath+"/period",schemaPath:"#/oneOf/2/properties/period/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
}
}
if(data.multiplier !== undefined){
let data7 = data.multiplier;
if(typeof data7 == "number"){
if(data7 > 10 || isNaN(data7)){
const err26 = {instancePath:instancePath+"/multiplier",schemaPath:"#/oneOf/2/properties/multiplier/maximum",keyword:"maximum",params:{comparison: "<=", limit: 10},message:"must be <= 10"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
if(data7 <= 0 || isNaN(data7)){
const err27 = {instancePath:instancePath+"/multiplier",schemaPath:"#/oneOf/2/properties/multiplier/exclusiveMinimum",keyword:"exclusiveMinimum",params:{comparison: ">", limit: 0},message:"must be > 0"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
}
else {
const err28 = {instancePath:instancePath+"/multiplier",schemaPath:"#/oneOf/2/properties/multiplier/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
}
}
else {
const err29 = {instancePath,schemaPath:"#/oneOf/2/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
var _valid0 = _errs15 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 2];
}
else {
if(_valid0){
valid0 = true;
passing0 = 2;
if(props0 !== true){
props0 = true;
}
}
const _errs23 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.type === undefined){
const err30 = {instancePath,schemaPath:"#/oneOf/3/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
if(data.fast === undefined){
const err31 = {instancePath,schemaPath:"#/oneOf/3/required",keyword:"required",params:{missingProperty: "fast"},message:"must have required property '"+"fast"+"'"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
if(data.slow === undefined){
const err32 = {instancePath,schemaPath:"#/oneOf/3/required",keyword:"required",params:{missingProperty: "slow"},message:"must have required property '"+"slow"+"'"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
if(data.signal === undefined){
const err33 = {instancePath,schemaPath:"#/oneOf/3/required",keyword:"required",params:{missingProperty: "signal"},message:"must have required property '"+"signal"+"'"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
for(const key3 in data){
if(!((((key3 === "type") || (key3 === "fast")) || (key3 === "slow")) || (key3 === "signal"))){
const err34 = {instancePath,schemaPath:"#/oneOf/3/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key3},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
}
if(data.type !== undefined){
if("MACD" !== data.type){
const err35 = {instancePath:instancePath+"/type",schemaPath:"#/oneOf/3/properties/type/const",keyword:"const",params:{allowedValue: "MACD"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
}
if(data.fast !== undefined){
let data9 = data.fast;
if(!((typeof data9 == "number") && (!(data9 % 1) && !isNaN(data9)))){
const err36 = {instancePath:instancePath+"/fast",schemaPath:"#/oneOf/3/properties/fast/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
if(typeof data9 == "number"){
if(data9 > 200 || isNaN(data9)){
const err37 = {instancePath:instancePath+"/fast",schemaPath:"#/oneOf/3/properties/fast/maximum",keyword:"maximum",params:{comparison: "<=", limit: 200},message:"must be <= 200"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
if(data9 < 1 || isNaN(data9)){
const err38 = {instancePath:instancePath+"/fast",schemaPath:"#/oneOf/3/properties/fast/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
}
}
if(data.slow !== undefined){
let data10 = data.slow;
if(!((typeof data10 == "number") && (!(data10 % 1) && !isNaN(data10)))){
const err39 = {instancePath:instancePath+"/slow",schemaPath:"#/oneOf/3/properties/slow/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
if(typeof data10 == "number"){
if(data10 > 400 || isNaN(data10)){
const err40 = {instancePath:instancePath+"/slow",schemaPath:"#/oneOf/3/properties/slow/maximum",keyword:"maximum",params:{comparison: "<=", limit: 400},message:"must be <= 400"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
if(data10 < 2 || isNaN(data10)){
const err41 = {instancePath:instancePath+"/slow",schemaPath:"#/oneOf/3/properties/slow/minimum",keyword:"minimum",params:{comparison: ">=", limit: 2},message:"must be >= 2"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
}
}
if(data.signal !== undefined){
let data11 = data.signal;
if(!((typeof data11 == "number") && (!(data11 % 1) && !isNaN(data11)))){
const err42 = {instancePath:instancePath+"/signal",schemaPath:"#/oneOf/3/properties/signal/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
if(typeof data11 == "number"){
if(data11 > 200 || isNaN(data11)){
const err43 = {instancePath:instancePath+"/signal",schemaPath:"#/oneOf/3/properties/signal/maximum",keyword:"maximum",params:{comparison: "<=", limit: 200},message:"must be <= 200"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
if(data11 < 1 || isNaN(data11)){
const err44 = {instancePath:instancePath+"/signal",schemaPath:"#/oneOf/3/properties/signal/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
}
}
}
else {
const err45 = {instancePath,schemaPath:"#/oneOf/3/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
var _valid0 = _errs23 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 3];
}
else {
if(_valid0){
valid0 = true;
passing0 = 3;
if(props0 !== true){
props0 = true;
}
}
const _errs33 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.type === undefined){
const err46 = {instancePath,schemaPath:"#/oneOf/4/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
if(data.period === undefined){
const err47 = {instancePath,schemaPath:"#/oneOf/4/required",keyword:"required",params:{missingProperty: "period"},message:"must have required property '"+"period"+"'"};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
if(data.stddev === undefined){
const err48 = {instancePath,schemaPath:"#/oneOf/4/required",keyword:"required",params:{missingProperty: "stddev"},message:"must have required property '"+"stddev"+"'"};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
if(data.source === undefined){
const err49 = {instancePath,schemaPath:"#/oneOf/4/required",keyword:"required",params:{missingProperty: "source"},message:"must have required property '"+"source"+"'"};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
for(const key4 in data){
if(!((((key4 === "type") || (key4 === "period")) || (key4 === "stddev")) || (key4 === "source"))){
const err50 = {instancePath,schemaPath:"#/oneOf/4/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key4},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err50];
}
else {
vErrors.push(err50);
}
errors++;
}
}
if(data.type !== undefined){
if("BBANDS" !== data.type){
const err51 = {instancePath:instancePath+"/type",schemaPath:"#/oneOf/4/properties/type/const",keyword:"const",params:{allowedValue: "BBANDS"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err51];
}
else {
vErrors.push(err51);
}
errors++;
}
}
if(data.period !== undefined){
let data13 = data.period;
if(!((typeof data13 == "number") && (!(data13 % 1) && !isNaN(data13)))){
const err52 = {instancePath:instancePath+"/period",schemaPath:"#/oneOf/4/properties/period/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err52];
}
else {
vErrors.push(err52);
}
errors++;
}
if(typeof data13 == "number"){
if(data13 > 500 || isNaN(data13)){
const err53 = {instancePath:instancePath+"/period",schemaPath:"#/oneOf/4/properties/period/maximum",keyword:"maximum",params:{comparison: "<=", limit: 500},message:"must be <= 500"};
if(vErrors === null){
vErrors = [err53];
}
else {
vErrors.push(err53);
}
errors++;
}
if(data13 < 2 || isNaN(data13)){
const err54 = {instancePath:instancePath+"/period",schemaPath:"#/oneOf/4/properties/period/minimum",keyword:"minimum",params:{comparison: ">=", limit: 2},message:"must be >= 2"};
if(vErrors === null){
vErrors = [err54];
}
else {
vErrors.push(err54);
}
errors++;
}
}
}
if(data.stddev !== undefined){
let data14 = data.stddev;
if(typeof data14 == "number"){
if(data14 > 5 || isNaN(data14)){
const err55 = {instancePath:instancePath+"/stddev",schemaPath:"#/oneOf/4/properties/stddev/maximum",keyword:"maximum",params:{comparison: "<=", limit: 5},message:"must be <= 5"};
if(vErrors === null){
vErrors = [err55];
}
else {
vErrors.push(err55);
}
errors++;
}
if(data14 <= 0 || isNaN(data14)){
const err56 = {instancePath:instancePath+"/stddev",schemaPath:"#/oneOf/4/properties/stddev/exclusiveMinimum",keyword:"exclusiveMinimum",params:{comparison: ">", limit: 0},message:"must be > 0"};
if(vErrors === null){
vErrors = [err56];
}
else {
vErrors.push(err56);
}
errors++;
}
}
else {
const err57 = {instancePath:instancePath+"/stddev",schemaPath:"#/oneOf/4/properties/stddev/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err57];
}
else {
vErrors.push(err57);
}
errors++;
}
}
if(data.source !== undefined){
let data15 = data.source;
if(!((((data15 === "open") || (data15 === "high")) || (data15 === "low")) || (data15 === "close"))){
const err58 = {instancePath:instancePath+"/source",schemaPath:"#/$defs/PriceField/enum",keyword:"enum",params:{allowedValues: schema33.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err58];
}
else {
vErrors.push(err58);
}
errors++;
}
}
}
else {
const err59 = {instancePath,schemaPath:"#/oneOf/4/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err59];
}
else {
vErrors.push(err59);
}
errors++;
}
var _valid0 = _errs33 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 4];
}
else {
if(_valid0){
valid0 = true;
passing0 = 4;
if(props0 !== true){
props0 = true;
}
}
}
}
}
}
if(!valid0){
const err60 = {instancePath,schemaPath:"#/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err60];
}
else {
vErrors.push(err60);
}
errors++;
}
else {
errors = _errs0;
if(vErrors !== null){
if(_errs0){
vErrors.length = _errs0;
}
else {
vErrors = null;
}
}
}
validate21.errors = vErrors;
evaluated0.props = props0;
return errors === 0;
}
validate21.evaluated = {"dynamicProps":true,"dynamicItems":false};

const schema35 = {"type":"object","additionalProperties":false,"required":["action","option_type","expiry","strike"],"properties":{"action":{"description":"Mandatory input 2.","enum":["BUY","SELL"]},"option_type":{"description":"Mandatory input 3. SIGNAL = CE when the CE entry condition is met, PE when the PE entry condition is met (option type 'both').","enum":["CE","PE","SIGNAL"]},"expiry":{"description":"Mandatory input 6.","enum":["CURRENT_WEEKLY","NEXT_WEEKLY","MONTHLY"]},"strike":{"$ref":"#/$defs/StrikeSelection"}}};
const schema36 = {"oneOf":[{"title":"By moneyness (mandatory inputs 4 and 5)","type":"object","additionalProperties":false,"required":["method","moneyness","distance_pts"],"properties":{"method":{"const":"MONEYNESS"},"moneyness":{"enum":["ATM","ITM","OTM"]},"distance_pts":{"type":"number","minimum":0,"maximum":100000}}},{"title":"By delta (advanced)","type":"object","additionalProperties":false,"required":["method","target_delta"],"properties":{"method":{"const":"DELTA"},"target_delta":{"type":"number","exclusiveMinimum":0,"exclusiveMaximum":1}}},{"title":"By premium (advanced)","type":"object","additionalProperties":false,"required":["method","target_premium"],"properties":{"method":{"const":"PREMIUM"},"target_premium":{"type":"number","exclusiveMinimum":0}}}]};

function validate23(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate23.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.action === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "action"},message:"must have required property '"+"action"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.option_type === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "option_type"},message:"must have required property '"+"option_type"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.expiry === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "expiry"},message:"must have required property '"+"expiry"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.strike === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "strike"},message:"must have required property '"+"strike"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
for(const key0 in data){
if(!((((key0 === "action") || (key0 === "option_type")) || (key0 === "expiry")) || (key0 === "strike"))){
const err4 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
if(data.action !== undefined){
let data0 = data.action;
if(!((data0 === "BUY") || (data0 === "SELL"))){
const err5 = {instancePath:instancePath+"/action",schemaPath:"#/properties/action/enum",keyword:"enum",params:{allowedValues: schema35.properties.action.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
if(data.option_type !== undefined){
let data1 = data.option_type;
if(!(((data1 === "CE") || (data1 === "PE")) || (data1 === "SIGNAL"))){
const err6 = {instancePath:instancePath+"/option_type",schemaPath:"#/properties/option_type/enum",keyword:"enum",params:{allowedValues: schema35.properties.option_type.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
if(data.expiry !== undefined){
let data2 = data.expiry;
if(!(((data2 === "CURRENT_WEEKLY") || (data2 === "NEXT_WEEKLY")) || (data2 === "MONTHLY"))){
const err7 = {instancePath:instancePath+"/expiry",schemaPath:"#/properties/expiry/enum",keyword:"enum",params:{allowedValues: schema35.properties.expiry.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
if(data.strike !== undefined){
let data3 = data.strike;
const _errs7 = errors;
let valid2 = false;
let passing0 = null;
const _errs8 = errors;
if(data3 && typeof data3 == "object" && !Array.isArray(data3)){
if(data3.method === undefined){
const err8 = {instancePath:instancePath+"/strike",schemaPath:"#/$defs/StrikeSelection/oneOf/0/required",keyword:"required",params:{missingProperty: "method"},message:"must have required property '"+"method"+"'"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
if(data3.moneyness === undefined){
const err9 = {instancePath:instancePath+"/strike",schemaPath:"#/$defs/StrikeSelection/oneOf/0/required",keyword:"required",params:{missingProperty: "moneyness"},message:"must have required property '"+"moneyness"+"'"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
if(data3.distance_pts === undefined){
const err10 = {instancePath:instancePath+"/strike",schemaPath:"#/$defs/StrikeSelection/oneOf/0/required",keyword:"required",params:{missingProperty: "distance_pts"},message:"must have required property '"+"distance_pts"+"'"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
for(const key1 in data3){
if(!(((key1 === "method") || (key1 === "moneyness")) || (key1 === "distance_pts"))){
const err11 = {instancePath:instancePath+"/strike",schemaPath:"#/$defs/StrikeSelection/oneOf/0/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
if(data3.method !== undefined){
if("MONEYNESS" !== data3.method){
const err12 = {instancePath:instancePath+"/strike/method",schemaPath:"#/$defs/StrikeSelection/oneOf/0/properties/method/const",keyword:"const",params:{allowedValue: "MONEYNESS"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
if(data3.moneyness !== undefined){
let data5 = data3.moneyness;
if(!(((data5 === "ATM") || (data5 === "ITM")) || (data5 === "OTM"))){
const err13 = {instancePath:instancePath+"/strike/moneyness",schemaPath:"#/$defs/StrikeSelection/oneOf/0/properties/moneyness/enum",keyword:"enum",params:{allowedValues: schema36.oneOf[0].properties.moneyness.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
if(data3.distance_pts !== undefined){
let data6 = data3.distance_pts;
if(typeof data6 == "number"){
if(data6 > 100000 || isNaN(data6)){
const err14 = {instancePath:instancePath+"/strike/distance_pts",schemaPath:"#/$defs/StrikeSelection/oneOf/0/properties/distance_pts/maximum",keyword:"maximum",params:{comparison: "<=", limit: 100000},message:"must be <= 100000"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
if(data6 < 0 || isNaN(data6)){
const err15 = {instancePath:instancePath+"/strike/distance_pts",schemaPath:"#/$defs/StrikeSelection/oneOf/0/properties/distance_pts/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
else {
const err16 = {instancePath:instancePath+"/strike/distance_pts",schemaPath:"#/$defs/StrikeSelection/oneOf/0/properties/distance_pts/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
}
else {
const err17 = {instancePath:instancePath+"/strike",schemaPath:"#/$defs/StrikeSelection/oneOf/0/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
var _valid0 = _errs8 === errors;
if(_valid0){
valid2 = true;
passing0 = 0;
var props0 = true;
}
const _errs15 = errors;
if(data3 && typeof data3 == "object" && !Array.isArray(data3)){
if(data3.method === undefined){
const err18 = {instancePath:instancePath+"/strike",schemaPath:"#/$defs/StrikeSelection/oneOf/1/required",keyword:"required",params:{missingProperty: "method"},message:"must have required property '"+"method"+"'"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
if(data3.target_delta === undefined){
const err19 = {instancePath:instancePath+"/strike",schemaPath:"#/$defs/StrikeSelection/oneOf/1/required",keyword:"required",params:{missingProperty: "target_delta"},message:"must have required property '"+"target_delta"+"'"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
for(const key2 in data3){
if(!((key2 === "method") || (key2 === "target_delta"))){
const err20 = {instancePath:instancePath+"/strike",schemaPath:"#/$defs/StrikeSelection/oneOf/1/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key2},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
}
if(data3.method !== undefined){
if("DELTA" !== data3.method){
const err21 = {instancePath:instancePath+"/strike/method",schemaPath:"#/$defs/StrikeSelection/oneOf/1/properties/method/const",keyword:"const",params:{allowedValue: "DELTA"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
}
if(data3.target_delta !== undefined){
let data8 = data3.target_delta;
if(typeof data8 == "number"){
if(data8 >= 1 || isNaN(data8)){
const err22 = {instancePath:instancePath+"/strike/target_delta",schemaPath:"#/$defs/StrikeSelection/oneOf/1/properties/target_delta/exclusiveMaximum",keyword:"exclusiveMaximum",params:{comparison: "<", limit: 1},message:"must be < 1"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
if(data8 <= 0 || isNaN(data8)){
const err23 = {instancePath:instancePath+"/strike/target_delta",schemaPath:"#/$defs/StrikeSelection/oneOf/1/properties/target_delta/exclusiveMinimum",keyword:"exclusiveMinimum",params:{comparison: ">", limit: 0},message:"must be > 0"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
}
else {
const err24 = {instancePath:instancePath+"/strike/target_delta",schemaPath:"#/$defs/StrikeSelection/oneOf/1/properties/target_delta/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
}
}
else {
const err25 = {instancePath:instancePath+"/strike",schemaPath:"#/$defs/StrikeSelection/oneOf/1/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
var _valid0 = _errs15 === errors;
if(_valid0 && valid2){
valid2 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid2 = true;
passing0 = 1;
if(props0 !== true){
props0 = true;
}
}
const _errs21 = errors;
if(data3 && typeof data3 == "object" && !Array.isArray(data3)){
if(data3.method === undefined){
const err26 = {instancePath:instancePath+"/strike",schemaPath:"#/$defs/StrikeSelection/oneOf/2/required",keyword:"required",params:{missingProperty: "method"},message:"must have required property '"+"method"+"'"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
if(data3.target_premium === undefined){
const err27 = {instancePath:instancePath+"/strike",schemaPath:"#/$defs/StrikeSelection/oneOf/2/required",keyword:"required",params:{missingProperty: "target_premium"},message:"must have required property '"+"target_premium"+"'"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
for(const key3 in data3){
if(!((key3 === "method") || (key3 === "target_premium"))){
const err28 = {instancePath:instancePath+"/strike",schemaPath:"#/$defs/StrikeSelection/oneOf/2/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key3},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
}
if(data3.method !== undefined){
if("PREMIUM" !== data3.method){
const err29 = {instancePath:instancePath+"/strike/method",schemaPath:"#/$defs/StrikeSelection/oneOf/2/properties/method/const",keyword:"const",params:{allowedValue: "PREMIUM"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
}
if(data3.target_premium !== undefined){
let data10 = data3.target_premium;
if(typeof data10 == "number"){
if(data10 <= 0 || isNaN(data10)){
const err30 = {instancePath:instancePath+"/strike/target_premium",schemaPath:"#/$defs/StrikeSelection/oneOf/2/properties/target_premium/exclusiveMinimum",keyword:"exclusiveMinimum",params:{comparison: ">", limit: 0},message:"must be > 0"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
}
else {
const err31 = {instancePath:instancePath+"/strike/target_premium",schemaPath:"#/$defs/StrikeSelection/oneOf/2/properties/target_premium/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
}
}
else {
const err32 = {instancePath:instancePath+"/strike",schemaPath:"#/$defs/StrikeSelection/oneOf/2/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
var _valid0 = _errs21 === errors;
if(_valid0 && valid2){
valid2 = false;
passing0 = [passing0, 2];
}
else {
if(_valid0){
valid2 = true;
passing0 = 2;
if(props0 !== true){
props0 = true;
}
}
}
}
if(!valid2){
const err33 = {instancePath:instancePath+"/strike",schemaPath:"#/$defs/StrikeSelection/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
else {
errors = _errs7;
if(vErrors !== null){
if(_errs7){
vErrors.length = _errs7;
}
else {
vErrors = null;
}
}
}
}
}
else {
const err34 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
validate23.errors = vErrors;
return errors === 0;
}
validate23.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema37 = {"description":"Mandatory input 11. An entry happens only when the entire strategy is satisfied (product.md §7.2). Triggers present together must all hold (at_time AND the side's conditions).","type":"object","additionalProperties":false,"minProperties":1,"properties":{"at_time":{"description":"Fixed entry time; with conditions it is an additional requirement.","$ref":"#/$defs/Time"},"ce":{"description":"Conditions that open CE (and SIGNAL-as-CE) legs.","$ref":"#/$defs/Condition"},"pe":{"description":"Conditions that open PE (and SIGNAL-as-PE) legs.","$ref":"#/$defs/Condition"},"all_legs":{"description":"Conditions that open all legs together (multi-leg, non-directional).","$ref":"#/$defs/Condition"}}};
const schema38 = {"description":"Clock time HH:MM, IST.","type":"string","pattern":"^([01][0-9]|2[0-3]):[0-5][0-9]$"};
const pattern7 = new RegExp("^([01][0-9]|2[0-3]):[0-5][0-9]$", "u");
const schema39 = {"description":"Evaluated on each candle close. Groups nest (max depth 4, SEM-15).","oneOf":[{"$ref":"#/$defs/AllGroup"},{"$ref":"#/$defs/AnyGroup"},{"$ref":"#/$defs/Compare"},{"$ref":"#/$defs/Cross"},{"$ref":"#/$defs/State"},{"$ref":"#/$defs/Turns"},{"$ref":"#/$defs/Slope"}]};
const schema40 = {"description":"True when every condition is true (AND).","type":"object","additionalProperties":false,"required":["type","conditions"],"properties":{"type":{"const":"all"},"conditions":{"type":"array","minItems":1,"maxItems":20,"items":{"$ref":"#/$defs/Condition"}}}};
const wrapper0 = {validate: validate26};

function validate27(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate27.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.type === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.conditions === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "conditions"},message:"must have required property '"+"conditions"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
for(const key0 in data){
if(!((key0 === "type") || (key0 === "conditions"))){
const err2 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
if(data.type !== undefined){
if("all" !== data.type){
const err3 = {instancePath:instancePath+"/type",schemaPath:"#/properties/type/const",keyword:"const",params:{allowedValue: "all"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
if(data.conditions !== undefined){
let data1 = data.conditions;
if(Array.isArray(data1)){
if(data1.length > 20){
const err4 = {instancePath:instancePath+"/conditions",schemaPath:"#/properties/conditions/maxItems",keyword:"maxItems",params:{limit: 20},message:"must NOT have more than 20 items"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data1.length < 1){
const err5 = {instancePath:instancePath+"/conditions",schemaPath:"#/properties/conditions/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
const len0 = data1.length;
for(let i0=0; i0<len0; i0++){
if(!(wrapper0.validate(data1[i0], {instancePath:instancePath+"/conditions/" + i0,parentData:data1,parentDataProperty:i0,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? wrapper0.validate.errors : vErrors.concat(wrapper0.validate.errors);
errors = vErrors.length;
}
}
}
else {
const err6 = {instancePath:instancePath+"/conditions",schemaPath:"#/properties/conditions/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
}
else {
const err7 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
validate27.errors = vErrors;
return errors === 0;
}
validate27.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema41 = {"description":"True when at least one condition is true (OR). Only used where the user's rule says 'or' (product.md §6.4).","type":"object","additionalProperties":false,"required":["type","conditions"],"properties":{"type":{"const":"any"},"conditions":{"type":"array","minItems":2,"maxItems":20,"items":{"$ref":"#/$defs/Condition"}}}};

function validate29(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate29.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.type === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.conditions === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "conditions"},message:"must have required property '"+"conditions"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
for(const key0 in data){
if(!((key0 === "type") || (key0 === "conditions"))){
const err2 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
if(data.type !== undefined){
if("any" !== data.type){
const err3 = {instancePath:instancePath+"/type",schemaPath:"#/properties/type/const",keyword:"const",params:{allowedValue: "any"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
if(data.conditions !== undefined){
let data1 = data.conditions;
if(Array.isArray(data1)){
if(data1.length > 20){
const err4 = {instancePath:instancePath+"/conditions",schemaPath:"#/properties/conditions/maxItems",keyword:"maxItems",params:{limit: 20},message:"must NOT have more than 20 items"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data1.length < 2){
const err5 = {instancePath:instancePath+"/conditions",schemaPath:"#/properties/conditions/minItems",keyword:"minItems",params:{limit: 2},message:"must NOT have fewer than 2 items"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
const len0 = data1.length;
for(let i0=0; i0<len0; i0++){
if(!(wrapper0.validate(data1[i0], {instancePath:instancePath+"/conditions/" + i0,parentData:data1,parentDataProperty:i0,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? wrapper0.validate.errors : vErrors.concat(wrapper0.validate.errors);
errors = vErrors.length;
}
}
}
else {
const err6 = {instancePath:instancePath+"/conditions",schemaPath:"#/properties/conditions/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
}
else {
const err7 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
validate29.errors = vErrors;
return errors === 0;
}
validate29.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema42 = {"type":"object","additionalProperties":false,"required":["type","left","op","right"],"properties":{"type":{"const":"compare"},"left":{"$ref":"#/$defs/Operand"},"op":{"enum":["gt","gte","lt","lte"]},"right":{"$ref":"#/$defs/Operand"}}};
const schema43 = {"oneOf":[{"title":"Indicator output","type":"object","additionalProperties":false,"required":["ind","output"],"properties":{"ind":{"$ref":"#/$defs/IndicatorId"},"output":{"enum":["value","signal","hist","upper","middle","lower","plus_di","minus_di"]},"offset":{"$ref":"#/$defs/Offset"}}},{"title":"Underlying candle price","type":"object","additionalProperties":false,"required":["price"],"properties":{"price":{"$ref":"#/$defs/PriceField"},"offset":{"$ref":"#/$defs/Offset"}}},{"title":"Volatility index value on the candle","type":"object","additionalProperties":false,"required":["vix"],"properties":{"vix":{"enum":["open","close"]}}},{"title":"Constant number","type":"object","additionalProperties":false,"required":["const"],"properties":{"const":{"type":"number"}}}]};
const schema44 = {"type":"string","pattern":"^[a-z][a-z0-9_]{0,31}$"};
const schema45 = {"description":"Shifts an operand, e.g. EMA 21 + 10 points, to express thresholds such as 'closes decisively above'.","oneOf":[{"type":"object","additionalProperties":false,"required":["pts"],"properties":{"pts":{"type":"number","minimum":-100000,"maximum":100000}}},{"type":"object","additionalProperties":false,"required":["pct"],"properties":{"pct":{"type":"number","minimum":-100,"maximum":100}}}]};

function validate32(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate32.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs0 = errors;
let valid0 = false;
let passing0 = null;
const _errs1 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.ind === undefined){
const err0 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "ind"},message:"must have required property '"+"ind"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.output === undefined){
const err1 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "output"},message:"must have required property '"+"output"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
for(const key0 in data){
if(!(((key0 === "ind") || (key0 === "output")) || (key0 === "offset"))){
const err2 = {instancePath,schemaPath:"#/oneOf/0/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
if(data.ind !== undefined){
let data0 = data.ind;
if(typeof data0 === "string"){
if(!pattern6.test(data0)){
const err3 = {instancePath:instancePath+"/ind",schemaPath:"#/$defs/IndicatorId/pattern",keyword:"pattern",params:{pattern: "^[a-z][a-z0-9_]{0,31}$"},message:"must match pattern \""+"^[a-z][a-z0-9_]{0,31}$"+"\""};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
else {
const err4 = {instancePath:instancePath+"/ind",schemaPath:"#/$defs/IndicatorId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
if(data.output !== undefined){
let data1 = data.output;
if(!((((((((data1 === "value") || (data1 === "signal")) || (data1 === "hist")) || (data1 === "upper")) || (data1 === "middle")) || (data1 === "lower")) || (data1 === "plus_di")) || (data1 === "minus_di"))){
const err5 = {instancePath:instancePath+"/output",schemaPath:"#/oneOf/0/properties/output/enum",keyword:"enum",params:{allowedValues: schema43.oneOf[0].properties.output.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
if(data.offset !== undefined){
let data2 = data.offset;
const _errs10 = errors;
let valid4 = false;
let passing1 = null;
const _errs11 = errors;
if(data2 && typeof data2 == "object" && !Array.isArray(data2)){
if(data2.pts === undefined){
const err6 = {instancePath:instancePath+"/offset",schemaPath:"#/$defs/Offset/oneOf/0/required",keyword:"required",params:{missingProperty: "pts"},message:"must have required property '"+"pts"+"'"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
for(const key1 in data2){
if(!(key1 === "pts")){
const err7 = {instancePath:instancePath+"/offset",schemaPath:"#/$defs/Offset/oneOf/0/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
if(data2.pts !== undefined){
let data3 = data2.pts;
if(typeof data3 == "number"){
if(data3 > 100000 || isNaN(data3)){
const err8 = {instancePath:instancePath+"/offset/pts",schemaPath:"#/$defs/Offset/oneOf/0/properties/pts/maximum",keyword:"maximum",params:{comparison: "<=", limit: 100000},message:"must be <= 100000"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
if(data3 < -100000 || isNaN(data3)){
const err9 = {instancePath:instancePath+"/offset/pts",schemaPath:"#/$defs/Offset/oneOf/0/properties/pts/minimum",keyword:"minimum",params:{comparison: ">=", limit: -100000},message:"must be >= -100000"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
else {
const err10 = {instancePath:instancePath+"/offset/pts",schemaPath:"#/$defs/Offset/oneOf/0/properties/pts/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
}
else {
const err11 = {instancePath:instancePath+"/offset",schemaPath:"#/$defs/Offset/oneOf/0/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
var _valid1 = _errs11 === errors;
if(_valid1){
valid4 = true;
passing1 = 0;
var props0 = true;
}
const _errs16 = errors;
if(data2 && typeof data2 == "object" && !Array.isArray(data2)){
if(data2.pct === undefined){
const err12 = {instancePath:instancePath+"/offset",schemaPath:"#/$defs/Offset/oneOf/1/required",keyword:"required",params:{missingProperty: "pct"},message:"must have required property '"+"pct"+"'"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
for(const key2 in data2){
if(!(key2 === "pct")){
const err13 = {instancePath:instancePath+"/offset",schemaPath:"#/$defs/Offset/oneOf/1/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key2},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
if(data2.pct !== undefined){
let data4 = data2.pct;
if(typeof data4 == "number"){
if(data4 > 100 || isNaN(data4)){
const err14 = {instancePath:instancePath+"/offset/pct",schemaPath:"#/$defs/Offset/oneOf/1/properties/pct/maximum",keyword:"maximum",params:{comparison: "<=", limit: 100},message:"must be <= 100"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
if(data4 < -100 || isNaN(data4)){
const err15 = {instancePath:instancePath+"/offset/pct",schemaPath:"#/$defs/Offset/oneOf/1/properties/pct/minimum",keyword:"minimum",params:{comparison: ">=", limit: -100},message:"must be >= -100"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
else {
const err16 = {instancePath:instancePath+"/offset/pct",schemaPath:"#/$defs/Offset/oneOf/1/properties/pct/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
}
else {
const err17 = {instancePath:instancePath+"/offset",schemaPath:"#/$defs/Offset/oneOf/1/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
var _valid1 = _errs16 === errors;
if(_valid1 && valid4){
valid4 = false;
passing1 = [passing1, 1];
}
else {
if(_valid1){
valid4 = true;
passing1 = 1;
if(props0 !== true){
props0 = true;
}
}
}
if(!valid4){
const err18 = {instancePath:instancePath+"/offset",schemaPath:"#/$defs/Offset/oneOf",keyword:"oneOf",params:{passingSchemas: passing1},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
else {
errors = _errs10;
if(vErrors !== null){
if(_errs10){
vErrors.length = _errs10;
}
else {
vErrors = null;
}
}
}
}
}
else {
const err19 = {instancePath,schemaPath:"#/oneOf/0/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
var _valid0 = _errs1 === errors;
if(_valid0){
valid0 = true;
passing0 = 0;
var props1 = true;
}
const _errs21 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.price === undefined){
const err20 = {instancePath,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty: "price"},message:"must have required property '"+"price"+"'"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
for(const key3 in data){
if(!((key3 === "price") || (key3 === "offset"))){
const err21 = {instancePath,schemaPath:"#/oneOf/1/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key3},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
}
if(data.price !== undefined){
let data5 = data.price;
if(!((((data5 === "open") || (data5 === "high")) || (data5 === "low")) || (data5 === "close"))){
const err22 = {instancePath:instancePath+"/price",schemaPath:"#/$defs/PriceField/enum",keyword:"enum",params:{allowedValues: schema33.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
}
if(data.offset !== undefined){
let data6 = data.offset;
const _errs28 = errors;
let valid10 = false;
let passing2 = null;
const _errs29 = errors;
if(data6 && typeof data6 == "object" && !Array.isArray(data6)){
if(data6.pts === undefined){
const err23 = {instancePath:instancePath+"/offset",schemaPath:"#/$defs/Offset/oneOf/0/required",keyword:"required",params:{missingProperty: "pts"},message:"must have required property '"+"pts"+"'"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
for(const key4 in data6){
if(!(key4 === "pts")){
const err24 = {instancePath:instancePath+"/offset",schemaPath:"#/$defs/Offset/oneOf/0/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key4},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
}
if(data6.pts !== undefined){
let data7 = data6.pts;
if(typeof data7 == "number"){
if(data7 > 100000 || isNaN(data7)){
const err25 = {instancePath:instancePath+"/offset/pts",schemaPath:"#/$defs/Offset/oneOf/0/properties/pts/maximum",keyword:"maximum",params:{comparison: "<=", limit: 100000},message:"must be <= 100000"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
if(data7 < -100000 || isNaN(data7)){
const err26 = {instancePath:instancePath+"/offset/pts",schemaPath:"#/$defs/Offset/oneOf/0/properties/pts/minimum",keyword:"minimum",params:{comparison: ">=", limit: -100000},message:"must be >= -100000"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
}
else {
const err27 = {instancePath:instancePath+"/offset/pts",schemaPath:"#/$defs/Offset/oneOf/0/properties/pts/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
}
}
else {
const err28 = {instancePath:instancePath+"/offset",schemaPath:"#/$defs/Offset/oneOf/0/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
var _valid2 = _errs29 === errors;
if(_valid2){
valid10 = true;
passing2 = 0;
var props2 = true;
}
const _errs34 = errors;
if(data6 && typeof data6 == "object" && !Array.isArray(data6)){
if(data6.pct === undefined){
const err29 = {instancePath:instancePath+"/offset",schemaPath:"#/$defs/Offset/oneOf/1/required",keyword:"required",params:{missingProperty: "pct"},message:"must have required property '"+"pct"+"'"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
for(const key5 in data6){
if(!(key5 === "pct")){
const err30 = {instancePath:instancePath+"/offset",schemaPath:"#/$defs/Offset/oneOf/1/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key5},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
}
if(data6.pct !== undefined){
let data8 = data6.pct;
if(typeof data8 == "number"){
if(data8 > 100 || isNaN(data8)){
const err31 = {instancePath:instancePath+"/offset/pct",schemaPath:"#/$defs/Offset/oneOf/1/properties/pct/maximum",keyword:"maximum",params:{comparison: "<=", limit: 100},message:"must be <= 100"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
if(data8 < -100 || isNaN(data8)){
const err32 = {instancePath:instancePath+"/offset/pct",schemaPath:"#/$defs/Offset/oneOf/1/properties/pct/minimum",keyword:"minimum",params:{comparison: ">=", limit: -100},message:"must be >= -100"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
}
else {
const err33 = {instancePath:instancePath+"/offset/pct",schemaPath:"#/$defs/Offset/oneOf/1/properties/pct/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
}
}
else {
const err34 = {instancePath:instancePath+"/offset",schemaPath:"#/$defs/Offset/oneOf/1/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
var _valid2 = _errs34 === errors;
if(_valid2 && valid10){
valid10 = false;
passing2 = [passing2, 1];
}
else {
if(_valid2){
valid10 = true;
passing2 = 1;
if(props2 !== true){
props2 = true;
}
}
}
if(!valid10){
const err35 = {instancePath:instancePath+"/offset",schemaPath:"#/$defs/Offset/oneOf",keyword:"oneOf",params:{passingSchemas: passing2},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
else {
errors = _errs28;
if(vErrors !== null){
if(_errs28){
vErrors.length = _errs28;
}
else {
vErrors = null;
}
}
}
}
}
else {
const err36 = {instancePath,schemaPath:"#/oneOf/1/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
var _valid0 = _errs21 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid0 = true;
passing0 = 1;
if(props1 !== true){
props1 = true;
}
}
const _errs39 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.vix === undefined){
const err37 = {instancePath,schemaPath:"#/oneOf/2/required",keyword:"required",params:{missingProperty: "vix"},message:"must have required property '"+"vix"+"'"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
for(const key6 in data){
if(!(key6 === "vix")){
const err38 = {instancePath,schemaPath:"#/oneOf/2/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key6},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
}
if(data.vix !== undefined){
let data9 = data.vix;
if(!((data9 === "open") || (data9 === "close"))){
const err39 = {instancePath:instancePath+"/vix",schemaPath:"#/oneOf/2/properties/vix/enum",keyword:"enum",params:{allowedValues: schema43.oneOf[2].properties.vix.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
}
}
else {
const err40 = {instancePath,schemaPath:"#/oneOf/2/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
var _valid0 = _errs39 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 2];
}
else {
if(_valid0){
valid0 = true;
passing0 = 2;
if(props1 !== true){
props1 = true;
}
}
const _errs43 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.const === undefined){
const err41 = {instancePath,schemaPath:"#/oneOf/3/required",keyword:"required",params:{missingProperty: "const"},message:"must have required property '"+"const"+"'"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
for(const key7 in data){
if(!(key7 === "const")){
const err42 = {instancePath,schemaPath:"#/oneOf/3/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key7},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
}
if(data.const !== undefined){
if(!(typeof data.const == "number")){
const err43 = {instancePath:instancePath+"/const",schemaPath:"#/oneOf/3/properties/const/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
}
}
else {
const err44 = {instancePath,schemaPath:"#/oneOf/3/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
var _valid0 = _errs43 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 3];
}
else {
if(_valid0){
valid0 = true;
passing0 = 3;
if(props1 !== true){
props1 = true;
}
}
}
}
}
if(!valid0){
const err45 = {instancePath,schemaPath:"#/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
else {
errors = _errs0;
if(vErrors !== null){
if(_errs0){
vErrors.length = _errs0;
}
else {
vErrors = null;
}
}
}
validate32.errors = vErrors;
evaluated0.props = props1;
return errors === 0;
}
validate32.evaluated = {"dynamicProps":true,"dynamicItems":false};


function validate31(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate31.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.type === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.left === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "left"},message:"must have required property '"+"left"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.op === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "op"},message:"must have required property '"+"op"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.right === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "right"},message:"must have required property '"+"right"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
for(const key0 in data){
if(!((((key0 === "type") || (key0 === "left")) || (key0 === "op")) || (key0 === "right"))){
const err4 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
if(data.type !== undefined){
if("compare" !== data.type){
const err5 = {instancePath:instancePath+"/type",schemaPath:"#/properties/type/const",keyword:"const",params:{allowedValue: "compare"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
if(data.left !== undefined){
if(!(validate32(data.left, {instancePath:instancePath+"/left",parentData:data,parentDataProperty:"left",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate32.errors : vErrors.concat(validate32.errors);
errors = vErrors.length;
}
}
if(data.op !== undefined){
let data2 = data.op;
if(!((((data2 === "gt") || (data2 === "gte")) || (data2 === "lt")) || (data2 === "lte"))){
const err6 = {instancePath:instancePath+"/op",schemaPath:"#/properties/op/enum",keyword:"enum",params:{allowedValues: schema42.properties.op.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
if(data.right !== undefined){
if(!(validate32(data.right, {instancePath:instancePath+"/right",parentData:data,parentDataProperty:"right",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate32.errors : vErrors.concat(validate32.errors);
errors = vErrors.length;
}
}
}
else {
const err7 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
validate31.errors = vErrors;
return errors === 0;
}
validate31.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema48 = {"description":"left crosses above/below right on this candle (was on the other side, or equal, on the previous candle).","type":"object","additionalProperties":false,"required":["type","left","direction","right"],"properties":{"type":{"const":"cross"},"left":{"$ref":"#/$defs/Operand"},"direction":{"enum":["above","below"]},"right":{"$ref":"#/$defs/Operand"}}};

function validate36(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate36.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.type === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.left === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "left"},message:"must have required property '"+"left"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.direction === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "direction"},message:"must have required property '"+"direction"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.right === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "right"},message:"must have required property '"+"right"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
for(const key0 in data){
if(!((((key0 === "type") || (key0 === "left")) || (key0 === "direction")) || (key0 === "right"))){
const err4 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
if(data.type !== undefined){
if("cross" !== data.type){
const err5 = {instancePath:instancePath+"/type",schemaPath:"#/properties/type/const",keyword:"const",params:{allowedValue: "cross"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
if(data.left !== undefined){
if(!(validate32(data.left, {instancePath:instancePath+"/left",parentData:data,parentDataProperty:"left",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate32.errors : vErrors.concat(validate32.errors);
errors = vErrors.length;
}
}
if(data.direction !== undefined){
let data2 = data.direction;
if(!((data2 === "above") || (data2 === "below"))){
const err6 = {instancePath:instancePath+"/direction",schemaPath:"#/properties/direction/enum",keyword:"enum",params:{allowedValues: schema48.properties.direction.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
if(data.right !== undefined){
if(!(validate32(data.right, {instancePath:instancePath+"/right",parentData:data,parentDataProperty:"right",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate32.errors : vErrors.concat(validate32.errors);
errors = vErrors.length;
}
}
}
else {
const err7 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
validate36.errors = vErrors;
return errors === 0;
}
validate36.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema49 = {"description":"A direction indicator is currently up/down (e.g. Supertrend is green), on any candle while it holds.","type":"object","additionalProperties":false,"required":["type","ind","is"],"properties":{"type":{"const":"state"},"ind":{"$ref":"#/$defs/IndicatorId"},"is":{"enum":["up","down"]}}};

function validate40(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate40.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.type === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.ind === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "ind"},message:"must have required property '"+"ind"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.is === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "is"},message:"must have required property '"+"is"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
for(const key0 in data){
if(!(((key0 === "type") || (key0 === "ind")) || (key0 === "is"))){
const err3 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
if(data.type !== undefined){
if("state" !== data.type){
const err4 = {instancePath:instancePath+"/type",schemaPath:"#/properties/type/const",keyword:"const",params:{allowedValue: "state"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
if(data.ind !== undefined){
let data1 = data.ind;
if(typeof data1 === "string"){
if(!pattern6.test(data1)){
const err5 = {instancePath:instancePath+"/ind",schemaPath:"#/$defs/IndicatorId/pattern",keyword:"pattern",params:{pattern: "^[a-z][a-z0-9_]{0,31}$"},message:"must match pattern \""+"^[a-z][a-z0-9_]{0,31}$"+"\""};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
else {
const err6 = {instancePath:instancePath+"/ind",schemaPath:"#/$defs/IndicatorId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
if(data.is !== undefined){
let data2 = data.is;
if(!((data2 === "up") || (data2 === "down"))){
const err7 = {instancePath:instancePath+"/is",schemaPath:"#/properties/is/enum",keyword:"enum",params:{allowedValues: schema49.properties.is.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
}
else {
const err8 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
validate40.errors = vErrors;
return errors === 0;
}
validate40.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema51 = {"description":"A direction indicator flips to up/down on this candle only (e.g. Supertrend turns green).","type":"object","additionalProperties":false,"required":["type","ind","to"],"properties":{"type":{"const":"turns"},"ind":{"$ref":"#/$defs/IndicatorId"},"to":{"enum":["up","down"]}}};

function validate42(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate42.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.type === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.ind === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "ind"},message:"must have required property '"+"ind"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.to === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "to"},message:"must have required property '"+"to"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
for(const key0 in data){
if(!(((key0 === "type") || (key0 === "ind")) || (key0 === "to"))){
const err3 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
if(data.type !== undefined){
if("turns" !== data.type){
const err4 = {instancePath:instancePath+"/type",schemaPath:"#/properties/type/const",keyword:"const",params:{allowedValue: "turns"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
if(data.ind !== undefined){
let data1 = data.ind;
if(typeof data1 === "string"){
if(!pattern6.test(data1)){
const err5 = {instancePath:instancePath+"/ind",schemaPath:"#/$defs/IndicatorId/pattern",keyword:"pattern",params:{pattern: "^[a-z][a-z0-9_]{0,31}$"},message:"must match pattern \""+"^[a-z][a-z0-9_]{0,31}$"+"\""};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
else {
const err6 = {instancePath:instancePath+"/ind",schemaPath:"#/$defs/IndicatorId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
if(data.to !== undefined){
let data2 = data.to;
if(!((data2 === "up") || (data2 === "down"))){
const err7 = {instancePath:instancePath+"/to",schemaPath:"#/properties/to/enum",keyword:"enum",params:{allowedValues: schema51.properties.to.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
}
else {
const err8 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
validate42.errors = vErrors;
return errors === 0;
}
validate42.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema53 = {"description":"Operand is higher (up) / lower (down) now than lookback candles ago.","type":"object","additionalProperties":false,"required":["type","operand","direction","lookback"],"properties":{"type":{"const":"slope"},"operand":{"$ref":"#/$defs/Operand"},"direction":{"enum":["up","down"]},"lookback":{"type":"integer","minimum":1,"maximum":50}}};

function validate44(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate44.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.type === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.operand === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "operand"},message:"must have required property '"+"operand"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.direction === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "direction"},message:"must have required property '"+"direction"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.lookback === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "lookback"},message:"must have required property '"+"lookback"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
for(const key0 in data){
if(!((((key0 === "type") || (key0 === "operand")) || (key0 === "direction")) || (key0 === "lookback"))){
const err4 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
if(data.type !== undefined){
if("slope" !== data.type){
const err5 = {instancePath:instancePath+"/type",schemaPath:"#/properties/type/const",keyword:"const",params:{allowedValue: "slope"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
if(data.operand !== undefined){
if(!(validate32(data.operand, {instancePath:instancePath+"/operand",parentData:data,parentDataProperty:"operand",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate32.errors : vErrors.concat(validate32.errors);
errors = vErrors.length;
}
}
if(data.direction !== undefined){
let data2 = data.direction;
if(!((data2 === "up") || (data2 === "down"))){
const err6 = {instancePath:instancePath+"/direction",schemaPath:"#/properties/direction/enum",keyword:"enum",params:{allowedValues: schema53.properties.direction.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
if(data.lookback !== undefined){
let data3 = data.lookback;
if(!((typeof data3 == "number") && (!(data3 % 1) && !isNaN(data3)))){
const err7 = {instancePath:instancePath+"/lookback",schemaPath:"#/properties/lookback/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if(typeof data3 == "number"){
if(data3 > 50 || isNaN(data3)){
const err8 = {instancePath:instancePath+"/lookback",schemaPath:"#/properties/lookback/maximum",keyword:"maximum",params:{comparison: "<=", limit: 50},message:"must be <= 50"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
if(data3 < 1 || isNaN(data3)){
const err9 = {instancePath:instancePath+"/lookback",schemaPath:"#/properties/lookback/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
}
}
else {
const err10 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
validate44.errors = vErrors;
return errors === 0;
}
validate44.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate26(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate26.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs0 = errors;
let valid0 = false;
let passing0 = null;
const _errs1 = errors;
if(!(validate27(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate27.errors : vErrors.concat(validate27.errors);
errors = vErrors.length;
}
var _valid0 = _errs1 === errors;
if(_valid0){
valid0 = true;
passing0 = 0;
var props0 = true;
}
const _errs2 = errors;
if(!(validate29(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate29.errors : vErrors.concat(validate29.errors);
errors = vErrors.length;
}
var _valid0 = _errs2 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid0 = true;
passing0 = 1;
if(props0 !== true){
props0 = true;
}
}
const _errs3 = errors;
if(!(validate31(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate31.errors : vErrors.concat(validate31.errors);
errors = vErrors.length;
}
var _valid0 = _errs3 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 2];
}
else {
if(_valid0){
valid0 = true;
passing0 = 2;
if(props0 !== true){
props0 = true;
}
}
const _errs4 = errors;
if(!(validate36(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate36.errors : vErrors.concat(validate36.errors);
errors = vErrors.length;
}
var _valid0 = _errs4 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 3];
}
else {
if(_valid0){
valid0 = true;
passing0 = 3;
if(props0 !== true){
props0 = true;
}
}
const _errs5 = errors;
if(!(validate40(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate40.errors : vErrors.concat(validate40.errors);
errors = vErrors.length;
}
var _valid0 = _errs5 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 4];
}
else {
if(_valid0){
valid0 = true;
passing0 = 4;
if(props0 !== true){
props0 = true;
}
}
const _errs6 = errors;
if(!(validate42(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate42.errors : vErrors.concat(validate42.errors);
errors = vErrors.length;
}
var _valid0 = _errs6 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 5];
}
else {
if(_valid0){
valid0 = true;
passing0 = 5;
if(props0 !== true){
props0 = true;
}
}
const _errs7 = errors;
if(!(validate44(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate44.errors : vErrors.concat(validate44.errors);
errors = vErrors.length;
}
var _valid0 = _errs7 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 6];
}
else {
if(_valid0){
valid0 = true;
passing0 = 6;
if(props0 !== true){
props0 = true;
}
}
}
}
}
}
}
}
if(!valid0){
const err0 = {instancePath,schemaPath:"#/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
else {
errors = _errs0;
if(vErrors !== null){
if(_errs0){
vErrors.length = _errs0;
}
else {
vErrors = null;
}
}
}
validate26.errors = vErrors;
evaluated0.props = props0;
return errors === 0;
}
validate26.evaluated = {"dynamicProps":true,"dynamicItems":false};


function validate25(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate25.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(Object.keys(data).length < 1){
const err0 = {instancePath,schemaPath:"#/minProperties",keyword:"minProperties",params:{limit: 1},message:"must NOT have fewer than 1 properties"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
for(const key0 in data){
if(!((((key0 === "at_time") || (key0 === "ce")) || (key0 === "pe")) || (key0 === "all_legs"))){
const err1 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
if(data.at_time !== undefined){
let data0 = data.at_time;
if(typeof data0 === "string"){
if(!pattern7.test(data0)){
const err2 = {instancePath:instancePath+"/at_time",schemaPath:"#/$defs/Time/pattern",keyword:"pattern",params:{pattern: "^([01][0-9]|2[0-3]):[0-5][0-9]$"},message:"must match pattern \""+"^([01][0-9]|2[0-3]):[0-5][0-9]$"+"\""};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
else {
const err3 = {instancePath:instancePath+"/at_time",schemaPath:"#/$defs/Time/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
if(data.ce !== undefined){
if(!(validate26(data.ce, {instancePath:instancePath+"/ce",parentData:data,parentDataProperty:"ce",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate26.errors : vErrors.concat(validate26.errors);
errors = vErrors.length;
}
}
if(data.pe !== undefined){
if(!(validate26(data.pe, {instancePath:instancePath+"/pe",parentData:data,parentDataProperty:"pe",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate26.errors : vErrors.concat(validate26.errors);
errors = vErrors.length;
}
}
if(data.all_legs !== undefined){
if(!(validate26(data.all_legs, {instancePath:instancePath+"/all_legs",parentData:data,parentDataProperty:"all_legs",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate26.errors : vErrors.concat(validate26.errors);
errors = vErrors.length;
}
}
}
else {
const err4 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
validate25.errors = vErrors;
return errors === 0;
}
validate25.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema54 = {"description":"Mandatory inputs 12 and 13. INTRADAY: the square-off time is the time exit. POSITIONAL: needs target, time_exit, hold_to_expiry or advanced.exit_after_candles, chosen by the user (SEM-07). A position still open on its expiry day is settled at intrinsic value. For multi-leg strategies, stop_loss and target apply to the combined position.","type":"object","additionalProperties":false,"required":["stop_loss"],"properties":{"stop_loss":{"oneOf":[{"title":"Percent of entry premium","type":"object","additionalProperties":false,"required":["type","value"],"properties":{"type":{"const":"PCT_PREMIUM"},"value":{"type":"number","exclusiveMinimum":0,"maximum":1000}}},{"title":"Premium points","type":"object","additionalProperties":false,"required":["type","value"],"properties":{"type":{"const":"POINTS"},"value":{"type":"number","exclusiveMinimum":0}}},{"title":"Trigger candle (advanced): low (bought) / high (sold) of the trigger candle on the modelled option premium","type":"object","additionalProperties":false,"required":["type"],"properties":{"type":{"const":"TRIGGER_CANDLE"}}}]},"target":{"oneOf":[{"type":"object","additionalProperties":false,"required":["type","value"],"properties":{"type":{"enum":["PCT_PREMIUM","POINTS"]},"value":{"type":"number","exclusiveMinimum":0}}},{"title":"Risk-reward (advanced): target distance = value × stop distance","type":"object","additionalProperties":false,"required":["type","value"],"properties":{"type":{"const":"RR"},"value":{"type":"number","exclusiveMinimum":0,"maximum":20}}}]},"time_exit":{"type":"object","additionalProperties":false,"required":["at","on"],"properties":{"at":{"$ref":"#/$defs/Time"},"on":{"enum":["ENTRY_DAY","EXPIRY_DAY"]}}},"hold_to_expiry":{"description":"Positional only, chosen by the user: hold until expiry and settle at intrinsic value. Only the value true is meaningful; absence means not chosen.","const":true}}};

function validate51(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate51.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.stop_loss === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "stop_loss"},message:"must have required property '"+"stop_loss"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
for(const key0 in data){
if(!((((key0 === "stop_loss") || (key0 === "target")) || (key0 === "time_exit")) || (key0 === "hold_to_expiry"))){
const err1 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
if(data.stop_loss !== undefined){
let data0 = data.stop_loss;
const _errs3 = errors;
let valid1 = false;
let passing0 = null;
const _errs4 = errors;
if(data0 && typeof data0 == "object" && !Array.isArray(data0)){
if(data0.type === undefined){
const err2 = {instancePath:instancePath+"/stop_loss",schemaPath:"#/properties/stop_loss/oneOf/0/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data0.value === undefined){
const err3 = {instancePath:instancePath+"/stop_loss",schemaPath:"#/properties/stop_loss/oneOf/0/required",keyword:"required",params:{missingProperty: "value"},message:"must have required property '"+"value"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
for(const key1 in data0){
if(!((key1 === "type") || (key1 === "value"))){
const err4 = {instancePath:instancePath+"/stop_loss",schemaPath:"#/properties/stop_loss/oneOf/0/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
if(data0.type !== undefined){
if("PCT_PREMIUM" !== data0.type){
const err5 = {instancePath:instancePath+"/stop_loss/type",schemaPath:"#/properties/stop_loss/oneOf/0/properties/type/const",keyword:"const",params:{allowedValue: "PCT_PREMIUM"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
if(data0.value !== undefined){
let data2 = data0.value;
if(typeof data2 == "number"){
if(data2 > 1000 || isNaN(data2)){
const err6 = {instancePath:instancePath+"/stop_loss/value",schemaPath:"#/properties/stop_loss/oneOf/0/properties/value/maximum",keyword:"maximum",params:{comparison: "<=", limit: 1000},message:"must be <= 1000"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
if(data2 <= 0 || isNaN(data2)){
const err7 = {instancePath:instancePath+"/stop_loss/value",schemaPath:"#/properties/stop_loss/oneOf/0/properties/value/exclusiveMinimum",keyword:"exclusiveMinimum",params:{comparison: ">", limit: 0},message:"must be > 0"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
else {
const err8 = {instancePath:instancePath+"/stop_loss/value",schemaPath:"#/properties/stop_loss/oneOf/0/properties/value/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
}
else {
const err9 = {instancePath:instancePath+"/stop_loss",schemaPath:"#/properties/stop_loss/oneOf/0/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
var _valid0 = _errs4 === errors;
if(_valid0){
valid1 = true;
passing0 = 0;
var props0 = true;
}
const _errs10 = errors;
if(data0 && typeof data0 == "object" && !Array.isArray(data0)){
if(data0.type === undefined){
const err10 = {instancePath:instancePath+"/stop_loss",schemaPath:"#/properties/stop_loss/oneOf/1/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
if(data0.value === undefined){
const err11 = {instancePath:instancePath+"/stop_loss",schemaPath:"#/properties/stop_loss/oneOf/1/required",keyword:"required",params:{missingProperty: "value"},message:"must have required property '"+"value"+"'"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
for(const key2 in data0){
if(!((key2 === "type") || (key2 === "value"))){
const err12 = {instancePath:instancePath+"/stop_loss",schemaPath:"#/properties/stop_loss/oneOf/1/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key2},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
if(data0.type !== undefined){
if("POINTS" !== data0.type){
const err13 = {instancePath:instancePath+"/stop_loss/type",schemaPath:"#/properties/stop_loss/oneOf/1/properties/type/const",keyword:"const",params:{allowedValue: "POINTS"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
if(data0.value !== undefined){
let data4 = data0.value;
if(typeof data4 == "number"){
if(data4 <= 0 || isNaN(data4)){
const err14 = {instancePath:instancePath+"/stop_loss/value",schemaPath:"#/properties/stop_loss/oneOf/1/properties/value/exclusiveMinimum",keyword:"exclusiveMinimum",params:{comparison: ">", limit: 0},message:"must be > 0"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
else {
const err15 = {instancePath:instancePath+"/stop_loss/value",schemaPath:"#/properties/stop_loss/oneOf/1/properties/value/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
}
else {
const err16 = {instancePath:instancePath+"/stop_loss",schemaPath:"#/properties/stop_loss/oneOf/1/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
var _valid0 = _errs10 === errors;
if(_valid0 && valid1){
valid1 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid1 = true;
passing0 = 1;
if(props0 !== true){
props0 = true;
}
}
const _errs16 = errors;
if(data0 && typeof data0 == "object" && !Array.isArray(data0)){
if(data0.type === undefined){
const err17 = {instancePath:instancePath+"/stop_loss",schemaPath:"#/properties/stop_loss/oneOf/2/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
for(const key3 in data0){
if(!(key3 === "type")){
const err18 = {instancePath:instancePath+"/stop_loss",schemaPath:"#/properties/stop_loss/oneOf/2/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key3},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
if(data0.type !== undefined){
if("TRIGGER_CANDLE" !== data0.type){
const err19 = {instancePath:instancePath+"/stop_loss/type",schemaPath:"#/properties/stop_loss/oneOf/2/properties/type/const",keyword:"const",params:{allowedValue: "TRIGGER_CANDLE"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
}
}
else {
const err20 = {instancePath:instancePath+"/stop_loss",schemaPath:"#/properties/stop_loss/oneOf/2/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
var _valid0 = _errs16 === errors;
if(_valid0 && valid1){
valid1 = false;
passing0 = [passing0, 2];
}
else {
if(_valid0){
valid1 = true;
passing0 = 2;
if(props0 !== true){
props0 = true;
}
}
}
}
if(!valid1){
const err21 = {instancePath:instancePath+"/stop_loss",schemaPath:"#/properties/stop_loss/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
else {
errors = _errs3;
if(vErrors !== null){
if(_errs3){
vErrors.length = _errs3;
}
else {
vErrors = null;
}
}
}
}
if(data.target !== undefined){
let data6 = data.target;
const _errs21 = errors;
let valid5 = false;
let passing1 = null;
const _errs22 = errors;
if(data6 && typeof data6 == "object" && !Array.isArray(data6)){
if(data6.type === undefined){
const err22 = {instancePath:instancePath+"/target",schemaPath:"#/properties/target/oneOf/0/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
if(data6.value === undefined){
const err23 = {instancePath:instancePath+"/target",schemaPath:"#/properties/target/oneOf/0/required",keyword:"required",params:{missingProperty: "value"},message:"must have required property '"+"value"+"'"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
for(const key4 in data6){
if(!((key4 === "type") || (key4 === "value"))){
const err24 = {instancePath:instancePath+"/target",schemaPath:"#/properties/target/oneOf/0/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key4},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
}
if(data6.type !== undefined){
let data7 = data6.type;
if(!((data7 === "PCT_PREMIUM") || (data7 === "POINTS"))){
const err25 = {instancePath:instancePath+"/target/type",schemaPath:"#/properties/target/oneOf/0/properties/type/enum",keyword:"enum",params:{allowedValues: schema54.properties.target.oneOf[0].properties.type.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
}
if(data6.value !== undefined){
let data8 = data6.value;
if(typeof data8 == "number"){
if(data8 <= 0 || isNaN(data8)){
const err26 = {instancePath:instancePath+"/target/value",schemaPath:"#/properties/target/oneOf/0/properties/value/exclusiveMinimum",keyword:"exclusiveMinimum",params:{comparison: ">", limit: 0},message:"must be > 0"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
}
else {
const err27 = {instancePath:instancePath+"/target/value",schemaPath:"#/properties/target/oneOf/0/properties/value/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
}
}
else {
const err28 = {instancePath:instancePath+"/target",schemaPath:"#/properties/target/oneOf/0/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
var _valid1 = _errs22 === errors;
if(_valid1){
valid5 = true;
passing1 = 0;
var props1 = true;
}
const _errs28 = errors;
if(data6 && typeof data6 == "object" && !Array.isArray(data6)){
if(data6.type === undefined){
const err29 = {instancePath:instancePath+"/target",schemaPath:"#/properties/target/oneOf/1/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
if(data6.value === undefined){
const err30 = {instancePath:instancePath+"/target",schemaPath:"#/properties/target/oneOf/1/required",keyword:"required",params:{missingProperty: "value"},message:"must have required property '"+"value"+"'"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
for(const key5 in data6){
if(!((key5 === "type") || (key5 === "value"))){
const err31 = {instancePath:instancePath+"/target",schemaPath:"#/properties/target/oneOf/1/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key5},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
}
if(data6.type !== undefined){
if("RR" !== data6.type){
const err32 = {instancePath:instancePath+"/target/type",schemaPath:"#/properties/target/oneOf/1/properties/type/const",keyword:"const",params:{allowedValue: "RR"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
}
if(data6.value !== undefined){
let data10 = data6.value;
if(typeof data10 == "number"){
if(data10 > 20 || isNaN(data10)){
const err33 = {instancePath:instancePath+"/target/value",schemaPath:"#/properties/target/oneOf/1/properties/value/maximum",keyword:"maximum",params:{comparison: "<=", limit: 20},message:"must be <= 20"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
if(data10 <= 0 || isNaN(data10)){
const err34 = {instancePath:instancePath+"/target/value",schemaPath:"#/properties/target/oneOf/1/properties/value/exclusiveMinimum",keyword:"exclusiveMinimum",params:{comparison: ">", limit: 0},message:"must be > 0"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
}
else {
const err35 = {instancePath:instancePath+"/target/value",schemaPath:"#/properties/target/oneOf/1/properties/value/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
}
}
else {
const err36 = {instancePath:instancePath+"/target",schemaPath:"#/properties/target/oneOf/1/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
var _valid1 = _errs28 === errors;
if(_valid1 && valid5){
valid5 = false;
passing1 = [passing1, 1];
}
else {
if(_valid1){
valid5 = true;
passing1 = 1;
if(props1 !== true){
props1 = true;
}
}
}
if(!valid5){
const err37 = {instancePath:instancePath+"/target",schemaPath:"#/properties/target/oneOf",keyword:"oneOf",params:{passingSchemas: passing1},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
else {
errors = _errs21;
if(vErrors !== null){
if(_errs21){
vErrors.length = _errs21;
}
else {
vErrors = null;
}
}
}
}
if(data.time_exit !== undefined){
let data11 = data.time_exit;
if(data11 && typeof data11 == "object" && !Array.isArray(data11)){
if(data11.at === undefined){
const err38 = {instancePath:instancePath+"/time_exit",schemaPath:"#/properties/time_exit/required",keyword:"required",params:{missingProperty: "at"},message:"must have required property '"+"at"+"'"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
if(data11.on === undefined){
const err39 = {instancePath:instancePath+"/time_exit",schemaPath:"#/properties/time_exit/required",keyword:"required",params:{missingProperty: "on"},message:"must have required property '"+"on"+"'"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
for(const key6 in data11){
if(!((key6 === "at") || (key6 === "on"))){
const err40 = {instancePath:instancePath+"/time_exit",schemaPath:"#/properties/time_exit/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key6},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
}
if(data11.at !== undefined){
let data12 = data11.at;
if(typeof data12 === "string"){
if(!pattern7.test(data12)){
const err41 = {instancePath:instancePath+"/time_exit/at",schemaPath:"#/$defs/Time/pattern",keyword:"pattern",params:{pattern: "^([01][0-9]|2[0-3]):[0-5][0-9]$"},message:"must match pattern \""+"^([01][0-9]|2[0-3]):[0-5][0-9]$"+"\""};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
}
else {
const err42 = {instancePath:instancePath+"/time_exit/at",schemaPath:"#/$defs/Time/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
}
if(data11.on !== undefined){
let data13 = data11.on;
if(!((data13 === "ENTRY_DAY") || (data13 === "EXPIRY_DAY"))){
const err43 = {instancePath:instancePath+"/time_exit/on",schemaPath:"#/properties/time_exit/properties/on/enum",keyword:"enum",params:{allowedValues: schema54.properties.time_exit.properties.on.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
}
}
else {
const err44 = {instancePath:instancePath+"/time_exit",schemaPath:"#/properties/time_exit/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
}
if(data.hold_to_expiry !== undefined){
if(true !== data.hold_to_expiry){
const err45 = {instancePath:instancePath+"/hold_to_expiry",schemaPath:"#/properties/hold_to_expiry/const",keyword:"const",params:{allowedValue: true},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
}
}
else {
const err46 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
validate51.errors = vErrors;
return errors === 0;
}
validate51.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema56 = {"description":"Every property is OFF when absent. No property has a default (constitution §3).","type":"object","additionalProperties":false,"properties":{"sl_cap_pts":{"description":"Maximum stop distance in premium points.","type":"number","exclusiveMinimum":0},"trail_to_cost_at_r":{"description":"Move stop to entry price once profit reaches this multiple of the initial risk.","type":"number","exclusiveMinimum":0,"maximum":20},"exit_after_candles":{"description":"Exit if neither stop nor target is hit within N candles after entry.","type":"integer","minimum":1,"maximum":500},"vix_sizing":{"description":"Position size per VIX band, as % of the set lots. Bands must cover all VIX values without gaps or overlaps (SEM-12). Result rounded down, minimum 1 lot.","type":"object","additionalProperties":false,"required":["measured_at","bands"],"properties":{"measured_at":{"description":"DAY_OPEN = the day's first VIX value (09:15; used for 'pre-market' rules). ENTRY = VIX at the entry minute.","enum":["DAY_OPEN","ENTRY"]},"bands":{"type":"array","minItems":1,"maxItems":6,"items":{"type":"object","additionalProperties":false,"required":["size_pct"],"properties":{"vix_from":{"description":"Inclusive lower edge; absent = no lower edge.","type":"number","minimum":0},"vix_to":{"description":"Exclusive upper edge; absent = no upper edge.","type":"number","exclusiveMinimum":0},"size_pct":{"type":"number","exclusiveMinimum":0,"maximum":1000}}}}}},"entry_windows":{"description":"New entries only inside these windows.","type":"array","minItems":1,"maxItems":6,"items":{"$ref":"#/$defs/TimeWindow"}},"no_entry_windows":{"description":"No new entries inside these windows.","type":"array","minItems":1,"maxItems":6,"items":{"$ref":"#/$defs/TimeWindow"}},"expiry_day_cutoff":{"description":"No new entries at or after this time on the traded contract's expiry day.","$ref":"#/$defs/Time"},"daily":{"type":"object","additionalProperties":false,"minProperties":1,"properties":{"max_trades":{"type":"integer","minimum":1,"maximum":100},"stop_after_sl_hits":{"type":"integer","minimum":1,"maximum":100},"max_daily_loss_rupees":{"type":"number","exclusiveMinimum":0}}}}};
const schema57 = {"type":"object","additionalProperties":false,"required":["from","to"],"properties":{"from":{"$ref":"#/$defs/Time"},"to":{"$ref":"#/$defs/Time"}}};

function validate54(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate54.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.from === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "from"},message:"must have required property '"+"from"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.to === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "to"},message:"must have required property '"+"to"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
for(const key0 in data){
if(!((key0 === "from") || (key0 === "to"))){
const err2 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
if(data.from !== undefined){
let data0 = data.from;
if(typeof data0 === "string"){
if(!pattern7.test(data0)){
const err3 = {instancePath:instancePath+"/from",schemaPath:"#/$defs/Time/pattern",keyword:"pattern",params:{pattern: "^([01][0-9]|2[0-3]):[0-5][0-9]$"},message:"must match pattern \""+"^([01][0-9]|2[0-3]):[0-5][0-9]$"+"\""};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
else {
const err4 = {instancePath:instancePath+"/from",schemaPath:"#/$defs/Time/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
if(data.to !== undefined){
let data1 = data.to;
if(typeof data1 === "string"){
if(!pattern7.test(data1)){
const err5 = {instancePath:instancePath+"/to",schemaPath:"#/$defs/Time/pattern",keyword:"pattern",params:{pattern: "^([01][0-9]|2[0-3]):[0-5][0-9]$"},message:"must match pattern \""+"^([01][0-9]|2[0-3]):[0-5][0-9]$"+"\""};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
else {
const err6 = {instancePath:instancePath+"/to",schemaPath:"#/$defs/Time/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
}
else {
const err7 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
validate54.errors = vErrors;
return errors === 0;
}
validate54.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate53(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate53.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
for(const key0 in data){
if(!((((((((key0 === "sl_cap_pts") || (key0 === "trail_to_cost_at_r")) || (key0 === "exit_after_candles")) || (key0 === "vix_sizing")) || (key0 === "entry_windows")) || (key0 === "no_entry_windows")) || (key0 === "expiry_day_cutoff")) || (key0 === "daily"))){
const err0 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
}
if(data.sl_cap_pts !== undefined){
let data0 = data.sl_cap_pts;
if(typeof data0 == "number"){
if(data0 <= 0 || isNaN(data0)){
const err1 = {instancePath:instancePath+"/sl_cap_pts",schemaPath:"#/properties/sl_cap_pts/exclusiveMinimum",keyword:"exclusiveMinimum",params:{comparison: ">", limit: 0},message:"must be > 0"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
else {
const err2 = {instancePath:instancePath+"/sl_cap_pts",schemaPath:"#/properties/sl_cap_pts/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
if(data.trail_to_cost_at_r !== undefined){
let data1 = data.trail_to_cost_at_r;
if(typeof data1 == "number"){
if(data1 > 20 || isNaN(data1)){
const err3 = {instancePath:instancePath+"/trail_to_cost_at_r",schemaPath:"#/properties/trail_to_cost_at_r/maximum",keyword:"maximum",params:{comparison: "<=", limit: 20},message:"must be <= 20"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data1 <= 0 || isNaN(data1)){
const err4 = {instancePath:instancePath+"/trail_to_cost_at_r",schemaPath:"#/properties/trail_to_cost_at_r/exclusiveMinimum",keyword:"exclusiveMinimum",params:{comparison: ">", limit: 0},message:"must be > 0"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
else {
const err5 = {instancePath:instancePath+"/trail_to_cost_at_r",schemaPath:"#/properties/trail_to_cost_at_r/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
if(data.exit_after_candles !== undefined){
let data2 = data.exit_after_candles;
if(!((typeof data2 == "number") && (!(data2 % 1) && !isNaN(data2)))){
const err6 = {instancePath:instancePath+"/exit_after_candles",schemaPath:"#/properties/exit_after_candles/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
if(typeof data2 == "number"){
if(data2 > 500 || isNaN(data2)){
const err7 = {instancePath:instancePath+"/exit_after_candles",schemaPath:"#/properties/exit_after_candles/maximum",keyword:"maximum",params:{comparison: "<=", limit: 500},message:"must be <= 500"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if(data2 < 1 || isNaN(data2)){
const err8 = {instancePath:instancePath+"/exit_after_candles",schemaPath:"#/properties/exit_after_candles/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
}
if(data.vix_sizing !== undefined){
let data3 = data.vix_sizing;
if(data3 && typeof data3 == "object" && !Array.isArray(data3)){
if(data3.measured_at === undefined){
const err9 = {instancePath:instancePath+"/vix_sizing",schemaPath:"#/properties/vix_sizing/required",keyword:"required",params:{missingProperty: "measured_at"},message:"must have required property '"+"measured_at"+"'"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
if(data3.bands === undefined){
const err10 = {instancePath:instancePath+"/vix_sizing",schemaPath:"#/properties/vix_sizing/required",keyword:"required",params:{missingProperty: "bands"},message:"must have required property '"+"bands"+"'"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
for(const key1 in data3){
if(!((key1 === "measured_at") || (key1 === "bands"))){
const err11 = {instancePath:instancePath+"/vix_sizing",schemaPath:"#/properties/vix_sizing/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
if(data3.measured_at !== undefined){
let data4 = data3.measured_at;
if(!((data4 === "DAY_OPEN") || (data4 === "ENTRY"))){
const err12 = {instancePath:instancePath+"/vix_sizing/measured_at",schemaPath:"#/properties/vix_sizing/properties/measured_at/enum",keyword:"enum",params:{allowedValues: schema56.properties.vix_sizing.properties.measured_at.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
if(data3.bands !== undefined){
let data5 = data3.bands;
if(Array.isArray(data5)){
if(data5.length > 6){
const err13 = {instancePath:instancePath+"/vix_sizing/bands",schemaPath:"#/properties/vix_sizing/properties/bands/maxItems",keyword:"maxItems",params:{limit: 6},message:"must NOT have more than 6 items"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
if(data5.length < 1){
const err14 = {instancePath:instancePath+"/vix_sizing/bands",schemaPath:"#/properties/vix_sizing/properties/bands/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
const len0 = data5.length;
for(let i0=0; i0<len0; i0++){
let data6 = data5[i0];
if(data6 && typeof data6 == "object" && !Array.isArray(data6)){
if(data6.size_pct === undefined){
const err15 = {instancePath:instancePath+"/vix_sizing/bands/" + i0,schemaPath:"#/properties/vix_sizing/properties/bands/items/required",keyword:"required",params:{missingProperty: "size_pct"},message:"must have required property '"+"size_pct"+"'"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
for(const key2 in data6){
if(!(((key2 === "vix_from") || (key2 === "vix_to")) || (key2 === "size_pct"))){
const err16 = {instancePath:instancePath+"/vix_sizing/bands/" + i0,schemaPath:"#/properties/vix_sizing/properties/bands/items/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key2},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
if(data6.vix_from !== undefined){
let data7 = data6.vix_from;
if(typeof data7 == "number"){
if(data7 < 0 || isNaN(data7)){
const err17 = {instancePath:instancePath+"/vix_sizing/bands/" + i0+"/vix_from",schemaPath:"#/properties/vix_sizing/properties/bands/items/properties/vix_from/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
else {
const err18 = {instancePath:instancePath+"/vix_sizing/bands/" + i0+"/vix_from",schemaPath:"#/properties/vix_sizing/properties/bands/items/properties/vix_from/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
if(data6.vix_to !== undefined){
let data8 = data6.vix_to;
if(typeof data8 == "number"){
if(data8 <= 0 || isNaN(data8)){
const err19 = {instancePath:instancePath+"/vix_sizing/bands/" + i0+"/vix_to",schemaPath:"#/properties/vix_sizing/properties/bands/items/properties/vix_to/exclusiveMinimum",keyword:"exclusiveMinimum",params:{comparison: ">", limit: 0},message:"must be > 0"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
}
else {
const err20 = {instancePath:instancePath+"/vix_sizing/bands/" + i0+"/vix_to",schemaPath:"#/properties/vix_sizing/properties/bands/items/properties/vix_to/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
}
if(data6.size_pct !== undefined){
let data9 = data6.size_pct;
if(typeof data9 == "number"){
if(data9 > 1000 || isNaN(data9)){
const err21 = {instancePath:instancePath+"/vix_sizing/bands/" + i0+"/size_pct",schemaPath:"#/properties/vix_sizing/properties/bands/items/properties/size_pct/maximum",keyword:"maximum",params:{comparison: "<=", limit: 1000},message:"must be <= 1000"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
if(data9 <= 0 || isNaN(data9)){
const err22 = {instancePath:instancePath+"/vix_sizing/bands/" + i0+"/size_pct",schemaPath:"#/properties/vix_sizing/properties/bands/items/properties/size_pct/exclusiveMinimum",keyword:"exclusiveMinimum",params:{comparison: ">", limit: 0},message:"must be > 0"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
}
else {
const err23 = {instancePath:instancePath+"/vix_sizing/bands/" + i0+"/size_pct",schemaPath:"#/properties/vix_sizing/properties/bands/items/properties/size_pct/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
}
}
else {
const err24 = {instancePath:instancePath+"/vix_sizing/bands/" + i0,schemaPath:"#/properties/vix_sizing/properties/bands/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
}
}
else {
const err25 = {instancePath:instancePath+"/vix_sizing/bands",schemaPath:"#/properties/vix_sizing/properties/bands/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
}
}
else {
const err26 = {instancePath:instancePath+"/vix_sizing",schemaPath:"#/properties/vix_sizing/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
}
if(data.entry_windows !== undefined){
let data10 = data.entry_windows;
if(Array.isArray(data10)){
if(data10.length > 6){
const err27 = {instancePath:instancePath+"/entry_windows",schemaPath:"#/properties/entry_windows/maxItems",keyword:"maxItems",params:{limit: 6},message:"must NOT have more than 6 items"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
if(data10.length < 1){
const err28 = {instancePath:instancePath+"/entry_windows",schemaPath:"#/properties/entry_windows/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
const len1 = data10.length;
for(let i1=0; i1<len1; i1++){
if(!(validate54(data10[i1], {instancePath:instancePath+"/entry_windows/" + i1,parentData:data10,parentDataProperty:i1,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate54.errors : vErrors.concat(validate54.errors);
errors = vErrors.length;
}
}
}
else {
const err29 = {instancePath:instancePath+"/entry_windows",schemaPath:"#/properties/entry_windows/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
}
if(data.no_entry_windows !== undefined){
let data12 = data.no_entry_windows;
if(Array.isArray(data12)){
if(data12.length > 6){
const err30 = {instancePath:instancePath+"/no_entry_windows",schemaPath:"#/properties/no_entry_windows/maxItems",keyword:"maxItems",params:{limit: 6},message:"must NOT have more than 6 items"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
if(data12.length < 1){
const err31 = {instancePath:instancePath+"/no_entry_windows",schemaPath:"#/properties/no_entry_windows/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
const len2 = data12.length;
for(let i2=0; i2<len2; i2++){
if(!(validate54(data12[i2], {instancePath:instancePath+"/no_entry_windows/" + i2,parentData:data12,parentDataProperty:i2,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate54.errors : vErrors.concat(validate54.errors);
errors = vErrors.length;
}
}
}
else {
const err32 = {instancePath:instancePath+"/no_entry_windows",schemaPath:"#/properties/no_entry_windows/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
}
if(data.expiry_day_cutoff !== undefined){
let data14 = data.expiry_day_cutoff;
if(typeof data14 === "string"){
if(!pattern7.test(data14)){
const err33 = {instancePath:instancePath+"/expiry_day_cutoff",schemaPath:"#/$defs/Time/pattern",keyword:"pattern",params:{pattern: "^([01][0-9]|2[0-3]):[0-5][0-9]$"},message:"must match pattern \""+"^([01][0-9]|2[0-3]):[0-5][0-9]$"+"\""};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
}
else {
const err34 = {instancePath:instancePath+"/expiry_day_cutoff",schemaPath:"#/$defs/Time/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
}
if(data.daily !== undefined){
let data15 = data.daily;
if(data15 && typeof data15 == "object" && !Array.isArray(data15)){
if(Object.keys(data15).length < 1){
const err35 = {instancePath:instancePath+"/daily",schemaPath:"#/properties/daily/minProperties",keyword:"minProperties",params:{limit: 1},message:"must NOT have fewer than 1 properties"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
for(const key3 in data15){
if(!(((key3 === "max_trades") || (key3 === "stop_after_sl_hits")) || (key3 === "max_daily_loss_rupees"))){
const err36 = {instancePath:instancePath+"/daily",schemaPath:"#/properties/daily/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key3},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
}
if(data15.max_trades !== undefined){
let data16 = data15.max_trades;
if(!((typeof data16 == "number") && (!(data16 % 1) && !isNaN(data16)))){
const err37 = {instancePath:instancePath+"/daily/max_trades",schemaPath:"#/properties/daily/properties/max_trades/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
if(typeof data16 == "number"){
if(data16 > 100 || isNaN(data16)){
const err38 = {instancePath:instancePath+"/daily/max_trades",schemaPath:"#/properties/daily/properties/max_trades/maximum",keyword:"maximum",params:{comparison: "<=", limit: 100},message:"must be <= 100"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
if(data16 < 1 || isNaN(data16)){
const err39 = {instancePath:instancePath+"/daily/max_trades",schemaPath:"#/properties/daily/properties/max_trades/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
}
}
if(data15.stop_after_sl_hits !== undefined){
let data17 = data15.stop_after_sl_hits;
if(!((typeof data17 == "number") && (!(data17 % 1) && !isNaN(data17)))){
const err40 = {instancePath:instancePath+"/daily/stop_after_sl_hits",schemaPath:"#/properties/daily/properties/stop_after_sl_hits/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
if(typeof data17 == "number"){
if(data17 > 100 || isNaN(data17)){
const err41 = {instancePath:instancePath+"/daily/stop_after_sl_hits",schemaPath:"#/properties/daily/properties/stop_after_sl_hits/maximum",keyword:"maximum",params:{comparison: "<=", limit: 100},message:"must be <= 100"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
if(data17 < 1 || isNaN(data17)){
const err42 = {instancePath:instancePath+"/daily/stop_after_sl_hits",schemaPath:"#/properties/daily/properties/stop_after_sl_hits/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
}
}
if(data15.max_daily_loss_rupees !== undefined){
let data18 = data15.max_daily_loss_rupees;
if(typeof data18 == "number"){
if(data18 <= 0 || isNaN(data18)){
const err43 = {instancePath:instancePath+"/daily/max_daily_loss_rupees",schemaPath:"#/properties/daily/properties/max_daily_loss_rupees/exclusiveMinimum",keyword:"exclusiveMinimum",params:{comparison: ">", limit: 0},message:"must be > 0"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
}
else {
const err44 = {instancePath:instancePath+"/daily/max_daily_loss_rupees",schemaPath:"#/properties/daily/properties/max_daily_loss_rupees/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
}
}
else {
const err45 = {instancePath:instancePath+"/daily",schemaPath:"#/properties/daily/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
}
}
else {
const err46 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
validate53.errors = vErrors;
return errors === 0;
}
validate53.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate20(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
/*# sourceURL="https://nikasha.local/contracts/strategy.schema.json" */;
let vErrors = null;
let errors = 0;
const evaluated0 = validate20.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.schema_version === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "schema_version"},message:"must have required property '"+"schema_version"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.underlying === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "underlying"},message:"must have required property '"+"underlying"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.timeframe_min === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "timeframe_min"},message:"must have required property '"+"timeframe_min"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.holding === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "holding"},message:"must have required property '"+"holding"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.position === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "position"},message:"must have required property '"+"position"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.indicators === undefined){
const err5 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "indicators"},message:"must have required property '"+"indicators"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data.legs === undefined){
const err6 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "legs"},message:"must have required property '"+"legs"+"'"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
if(data.entry === undefined){
const err7 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "entry"},message:"must have required property '"+"entry"+"'"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if(data.exit === undefined){
const err8 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "exit"},message:"must have required property '"+"exit"+"'"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
for(const key0 in data){
if(!(func1.call(schema31.properties, key0))){
const err9 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
if(data.schema_version !== undefined){
if("1.0" !== data.schema_version){
const err10 = {instancePath:instancePath+"/schema_version",schemaPath:"#/properties/schema_version/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
if(data.name !== undefined){
let data1 = data.name;
if(typeof data1 === "string"){
if(func2(data1) > 120){
const err11 = {instancePath:instancePath+"/name",schemaPath:"#/properties/name/maxLength",keyword:"maxLength",params:{limit: 120},message:"must NOT have more than 120 characters"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(func2(data1) < 1){
const err12 = {instancePath:instancePath+"/name",schemaPath:"#/properties/name/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
else {
const err13 = {instancePath:instancePath+"/name",schemaPath:"#/properties/name/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
if(data.origin !== undefined){
let data2 = data.origin;
if(!(((data2 === "TEMPLATE") || (data2 === "BUILDER")) || (data2 === "UPLOAD"))){
const err14 = {instancePath:instancePath+"/origin",schemaPath:"#/properties/origin/enum",keyword:"enum",params:{allowedValues: schema31.properties.origin.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
if(data.template_id !== undefined){
let data3 = data.template_id;
if(typeof data3 === "string"){
if(!pattern4.test(data3)){
const err15 = {instancePath:instancePath+"/template_id",schemaPath:"#/properties/template_id/pattern",keyword:"pattern",params:{pattern: "^[a-z0-9-]{1,40}$"},message:"must match pattern \""+"^[a-z0-9-]{1,40}$"+"\""};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
else {
const err16 = {instancePath:instancePath+"/template_id",schemaPath:"#/properties/template_id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
if(data.underlying !== undefined){
let data4 = data.underlying;
if(typeof data4 === "string"){
if(!pattern5.test(data4)){
const err17 = {instancePath:instancePath+"/underlying",schemaPath:"#/properties/underlying/pattern",keyword:"pattern",params:{pattern: "^[A-Z0-9_]{2,20}$"},message:"must match pattern \""+"^[A-Z0-9_]{2,20}$"+"\""};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
else {
const err18 = {instancePath:instancePath+"/underlying",schemaPath:"#/properties/underlying/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
if(data.timeframe_min !== undefined){
let data5 = data.timeframe_min;
if(!(((((((data5 === 1) || (data5 === 3)) || (data5 === 5)) || (data5 === 15)) || (data5 === 30)) || (data5 === 60)) || (data5 === 240))){
const err19 = {instancePath:instancePath+"/timeframe_min",schemaPath:"#/properties/timeframe_min/enum",keyword:"enum",params:{allowedValues: schema31.properties.timeframe_min.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
}
if(data.holding !== undefined){
let data6 = data.holding;
if(!((data6 === "INTRADAY") || (data6 === "POSITIONAL"))){
const err20 = {instancePath:instancePath+"/holding",schemaPath:"#/properties/holding/enum",keyword:"enum",params:{allowedValues: schema31.properties.holding.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
}
if(data.position !== undefined){
let data7 = data.position;
if(data7 && typeof data7 == "object" && !Array.isArray(data7)){
if(data7.lots === undefined){
const err21 = {instancePath:instancePath+"/position",schemaPath:"#/properties/position/required",keyword:"required",params:{missingProperty: "lots"},message:"must have required property '"+"lots"+"'"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
if(data7.lot_size === undefined){
const err22 = {instancePath:instancePath+"/position",schemaPath:"#/properties/position/required",keyword:"required",params:{missingProperty: "lot_size"},message:"must have required property '"+"lot_size"+"'"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
for(const key1 in data7){
if(!((key1 === "lots") || (key1 === "lot_size"))){
const err23 = {instancePath:instancePath+"/position",schemaPath:"#/properties/position/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
}
if(data7.lots !== undefined){
let data8 = data7.lots;
if(!((typeof data8 == "number") && (!(data8 % 1) && !isNaN(data8)))){
const err24 = {instancePath:instancePath+"/position/lots",schemaPath:"#/properties/position/properties/lots/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
if(typeof data8 == "number"){
if(data8 > 1000 || isNaN(data8)){
const err25 = {instancePath:instancePath+"/position/lots",schemaPath:"#/properties/position/properties/lots/maximum",keyword:"maximum",params:{comparison: "<=", limit: 1000},message:"must be <= 1000"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
if(data8 < 1 || isNaN(data8)){
const err26 = {instancePath:instancePath+"/position/lots",schemaPath:"#/properties/position/properties/lots/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
}
}
if(data7.lot_size !== undefined){
let data9 = data7.lot_size;
if(!((typeof data9 == "number") && (!(data9 % 1) && !isNaN(data9)))){
const err27 = {instancePath:instancePath+"/position/lot_size",schemaPath:"#/properties/position/properties/lot_size/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
if(typeof data9 == "number"){
if(data9 > 100000 || isNaN(data9)){
const err28 = {instancePath:instancePath+"/position/lot_size",schemaPath:"#/properties/position/properties/lot_size/maximum",keyword:"maximum",params:{comparison: "<=", limit: 100000},message:"must be <= 100000"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
if(data9 < 1 || isNaN(data9)){
const err29 = {instancePath:instancePath+"/position/lot_size",schemaPath:"#/properties/position/properties/lot_size/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
}
}
}
else {
const err30 = {instancePath:instancePath+"/position",schemaPath:"#/properties/position/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
}
if(data.indicators !== undefined){
let data10 = data.indicators;
if(data10 && typeof data10 == "object" && !Array.isArray(data10)){
if(Object.keys(data10).length > 20){
const err31 = {instancePath:instancePath+"/indicators",schemaPath:"#/properties/indicators/maxProperties",keyword:"maxProperties",params:{limit: 20},message:"must NOT have more than 20 properties"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
for(const key2 in data10){
const _errs22 = errors;
if(typeof key2 === "string"){
if(!pattern6.test(key2)){
const err32 = {instancePath:instancePath+"/indicators",schemaPath:"#/properties/indicators/propertyNames/pattern",keyword:"pattern",params:{pattern: "^[a-z][a-z0-9_]{0,31}$"},message:"must match pattern \""+"^[a-z][a-z0-9_]{0,31}$"+"\"",propertyName:key2};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
}
var valid2 = _errs22 === errors;
if(!valid2){
const err33 = {instancePath:instancePath+"/indicators",schemaPath:"#/properties/indicators/propertyNames",keyword:"propertyNames",params:{propertyName: key2},message:"property name must be valid"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
}
for(const key3 in data10){
if(!(validate21(data10[key3], {instancePath:instancePath+"/indicators/" + key3.replace(/~/g, "~0").replace(/\//g, "~1"),parentData:data10,parentDataProperty:key3,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate21.errors : vErrors.concat(validate21.errors);
errors = vErrors.length;
}
}
}
else {
const err34 = {instancePath:instancePath+"/indicators",schemaPath:"#/properties/indicators/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
}
if(data.legs !== undefined){
let data12 = data.legs;
if(Array.isArray(data12)){
if(data12.length > 4){
const err35 = {instancePath:instancePath+"/legs",schemaPath:"#/properties/legs/maxItems",keyword:"maxItems",params:{limit: 4},message:"must NOT have more than 4 items"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
if(data12.length < 1){
const err36 = {instancePath:instancePath+"/legs",schemaPath:"#/properties/legs/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
const len0 = data12.length;
for(let i0=0; i0<len0; i0++){
if(!(validate23(data12[i0], {instancePath:instancePath+"/legs/" + i0,parentData:data12,parentDataProperty:i0,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate23.errors : vErrors.concat(validate23.errors);
errors = vErrors.length;
}
}
}
else {
const err37 = {instancePath:instancePath+"/legs",schemaPath:"#/properties/legs/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
}
if(data.entry !== undefined){
if(!(validate25(data.entry, {instancePath:instancePath+"/entry",parentData:data,parentDataProperty:"entry",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate25.errors : vErrors.concat(validate25.errors);
errors = vErrors.length;
}
}
if(data.exit !== undefined){
if(!(validate51(data.exit, {instancePath:instancePath+"/exit",parentData:data,parentDataProperty:"exit",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate51.errors : vErrors.concat(validate51.errors);
errors = vErrors.length;
}
}
if(data.advanced !== undefined){
if(!(validate53(data.advanced, {instancePath:instancePath+"/advanced",parentData:data,parentDataProperty:"advanced",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate53.errors : vErrors.concat(validate53.errors);
errors = vErrors.length;
}
}
}
else {
const err38 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
validate20.errors = vErrors;
return errors === 0;
}
validate20.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};
