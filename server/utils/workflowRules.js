
const ORDER_TRANSITIONS = Object.freeze({
  placed: ["accepted", "cancelled", "rejected"],
  accepted: ["packed", "cancelled"],
  packed: ["dispatched"],
  dispatched: ["delivered"],
  delivered: [],
  cancelled: [],
  rejected: [],
});

const LOGISTICS_TRANSITIONS = Object.freeze({
  open: ["forming", "cancelled"],
  forming: ["ready", "cancelled"],
  ready: ["in_transit", "cancelled"],
  in_transit: ["completed"],
  completed: [],
  cancelled: [],
});

function canTransition(map, current, next) {
  return Array.isArray(map[current]) && map[current].includes(next);
}

module.exports = {
  ORDER_TRANSITIONS,
  LOGISTICS_TRANSITIONS,
  canTransitionOrder: (current, next) =>
    canTransition(ORDER_TRANSITIONS, current, next),
  canTransitionLogistics: (current, next) =>
    canTransition(LOGISTICS_TRANSITIONS, current, next),
};
