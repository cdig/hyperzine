Take [], ()->
  state = "Default"
  history = []
  transitions = "*": "*": []


  transition = (to, addToHistory = true)->
    transitionsToRun = [] if not transitions[state]?[to]?
    transitionsToRun = transitionsToRun.concat transitions["*"][to] if transitions["*"][to]?
    transitionsToRun = transitionsToRun.concat transitions[state]["*"] if transitions[state]?

    allowedToTransition = true

    for transition in transitionsToRun when allowedToTransition
      result = transition state, to
      if result? and typeof result isnt "boolean" then throw "#{state}->#{to} transition must return a boolean or null:\n #{transition}"
      allowedToTransition &&= result

    if allowedToTransition
      history.push state if addToHistory
      state = to

    return allowedToTransition


  addTransition = (from, to, cb)->
    transitions[from] ?= "*": []
    transitions[from][to] ?= []
    transitions[from][to].push cb


  StateMachine = (a, b, c)->
    return state                      unless a?  # 0 arity
    return transition a               unless b?  # 1 arity
    throw "Invalid StateMachine Call" unless c?  # 2 arity
    addTransition a, b, c                        # 3 arity


  StateMachine.back = ()->
    if history.length > 1
      history.pop()
      transition history[history.length - 1], false

  window.StateMachine = StateMachine
  Make "StateMachine", StateMachine
