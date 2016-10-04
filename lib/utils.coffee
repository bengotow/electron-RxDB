path = require('path')

DefaultResourcePath = null
DatabaseObjectRegistry = require('./database-object-registry').default

imageData = null

module.exports =
Utils =
  waitFor: (latch, options = {}) ->
    timeout = options.timeout || 400
    expire = Date.now() + timeout
    return new Promise (resolve, reject) ->
      attempt = ->
        if Date.now() > expire
          return reject(new Error("Utils.waitFor hit timeout (#{timeout}ms) without firing."))
        if latch()
          return resolve()
        window.requestAnimationFrame(attempt)
      attempt()

  showIconForAttachments: (files) ->
    return false unless files instanceof Array
    return files.find (f) -> !f.contentId or f.size > 12 * 1024

  extractTextFromHtml: (html, {maxLength} = {}) ->
    if (html ? "").trim().length is 0 then return ""
    if maxLength and html.length > maxLength
      html = html.slice(0, maxLength)
    (new DOMParser()).parseFromString(html, "text/html").body.innerText

  registeredObjectReviver: (k,v) ->
    type = v?.__constructorName
    return v unless type

    if DatabaseObjectRegistry.isInRegistry(type)
      return DatabaseObjectRegistry.deserialize(type, v)

    return v

  registeredObjectReplacer: (k, v) ->
    if v instanceof Object
      type = this[k].constructor.name
      if DatabaseObjectRegistry.isInRegistry(type)
        v.__constructorName = type
    return v

  fastOmit: (props, without) ->
    otherProps = Object.assign({}, props)
    delete otherProps[w] for w in without
    otherProps

  escapeRegExp: (str) ->
    str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&")

  # Generates a new RegExp that is great for basic search fields. It
  # checks if the test string is at the start of words
  #
  # See regex explanation and test here:
  # https://regex101.com/r/zG7aW4/2
  wordSearchRegExp: (str="") ->
    new RegExp("((?:^|\\W|$)#{Utils.escapeRegExp(str.trim())})", "ig")

  toSet: (arr=[]) ->
    set = {}
    set[item] = true for item in arr
    return set

  # Given a File object or uploadData of an uploading file object,
  # determine if it looks like an image and is in the size range for previews
  shouldDisplayAsImage: (file={}) ->
    name = file.filename ? file.fileName ? file.name ? ""
    size = file.size ? file.fileSize ? 0
    ext = path.extname(name).toLowerCase()
    extensions = ['.jpg', '.bmp', '.gif', '.png', '.jpeg']

    return ext in extensions and size > 512 and size < 1024*1024*5


  # Escapes potentially dangerous html characters
  # This code is lifted from Angular.js
  # See their specs here:
  # https://github.com/angular/angular.js/blob/master/test/ngSanitize/sanitizeSpec.js
  # And the original source here: https://github.com/angular/angular.js/blob/master/src/ngSanitize/sanitize.js#L451
  encodeHTMLEntities: (value) ->
    SURROGATE_PAIR_REGEXP = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g
    pairFix = (value) ->
      hi = value.charCodeAt(0)
      low = value.charCodeAt(1)
      return '&#' + (((hi - 0xD800) * 0x400) + (low - 0xDC00) + 0x10000) + ';'

    # Match everything outside of normal chars and " (quote character)
    NON_ALPHANUMERIC_REGEXP = /([^\#-~| |!])/g
    alphaFix = (value) -> '&#' + value.charCodeAt(0) + ';'

    value.replace(/&/g, '&amp;').
          replace(SURROGATE_PAIR_REGEXP, pairFix).
          replace(NON_ALPHANUMERIC_REGEXP, alphaFix).
          replace(/</g, '&lt;').
          replace(/>/g, '&gt;')

  modelFreeze: (o) ->
    Object.freeze(o)
    Object.getOwnPropertyNames(o).forEach (key) ->
      val = o[key]
      if typeof val is 'object' and val isnt null and not Object.isFrozen(val)
        Utils.modelFreeze(val)

  generateTempId: ->
    s4 = ->
      Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)
    'local-' + s4() + s4() + '-' + s4()

  generateFakeServerId: ->
    s5 = ->
      Math.floor((1 + Math.random()) * 0x10000000).toString(36).substring(1)
    return s5() + s5() + s5() + s5() + s5()

  isTempId: (id) ->
    return false unless id and typeof(id) == 'string'
    id[0..5] is 'local-'

  tableNameForJoin: (primaryKlass, secondaryKlass) ->
    "#{primaryKlass.name}#{secondaryKlass.name}"


  subjectWithPrefix: (subject, prefix) ->
    if subject.search(/fwd:/i) is 0
      return subject.replace(/fwd:/i, prefix)
    else if subject.search(/re:/i) is 0
      return subject.replace(/re:/i, prefix)
    else
      return "#{prefix} #{subject}"

  # This looks for and removes plus-ing, it taks a VERY liberal approach
  # to match an email address. We'd rather let false positives through.
  toEquivalentEmailForm: (email) ->
    # https://regex101.com/r/iS7kD5/1
    localPart1 = /([^+]+?)[+@].*/gi.exec(email)?[1] ? ""

    # https://regex101.com/r/iS7kD5/2
    domainPart1 = /@(.+)/gi.exec(email)?[1] ? ""

    email = "#{localPart1}@#{domainPart1}".trim().toLowerCase()
    return email

  emailIsEquivalent: (email1="", email2="") ->
    return true if email1 is email2
    email1 = Utils.toEquivalentEmailForm(email1)
    email2 = Utils.toEquivalentEmailForm(email2)
    return email1 is email2

  rectVisibleInRect: (r1, r2) ->
    return !(r2.left > r1.right ||  r2.right < r1.left ||  r2.top > r1.bottom || r2.bottom < r1.top)

  isEqualReact: (a, b, options={}) ->
    options.functionsAreEqual = true
    options.ignoreKeys = (options.ignoreKeys ? []).push("clientId")
    Utils.isEqual(a, b, options)

  # Customized version of Underscore 1.8.2's isEqual function
  # You can pass the following options:
  #   - functionsAreEqual: if true then all functions are equal
  #   - keysToIgnore: an array of object keys to ignore checks on
  #   - logWhenFalse: logs when isEqual returns false
  isEqual: (a, b, options={}) ->
    value = Utils._isEqual(a, b, [], [], options)
    if options.logWhenFalse
      if value is false then console.log "isEqual is false", a, b, options
      return value
    else
    return value

  # This method ensures that the provided function `fn` is only executing
  # once at any given time. `fn` should have the following signature:
  #
  # (finished, reinvoked, arg1, arg2, ...)
  #
  # During execution, the function can call reinvoked() to see if
  # it has been called again since it was invoked. When it stops
  # or finishes execution, it should call finished()
  #
  # If the wrapped function is called again while `fn` is still executing,
  # another invocation of the function is queued up. The paramMerge
  # function allows you to control the params that are passed to
  # the next invocation.
  #
  # For example,
  #
  # fetchFromCache({shallow: true})
  #
  # fetchFromCache({shallow: true})
  #  -- will be executed once the initial call finishes
  #
  # fetchFromCache({})
  #  -- `paramMerge` is called with `[{}]` and `[{shallow:true}]`. At this
  #     point it should return `[{}]` since calling fetchFromCache with no
  #     options is a more significant refresh.
  #
  ensureSerialExecution: (fn, paramMerge) ->
    fnRun = null
    fnReinvoked = ->
      fn.next
    fnFinished = ->
      fn.executing = false
      if fn.next
        args = fn.next
        fn.next = null
        fnRun(args...)
    fnRun = ->
      if fn.executing
        if fn.next
          fn.next = paramMerge(fn.next, arguments)
        else
          fn.next = arguments
      else
        fn.executing = true
        fn.apply(@, [fnFinished, fnReinvoked, arguments...])
    fnRun


  hueForString: (str='') ->
    str.split('').map((c) -> c.charCodeAt()).reduce((n,a) -> n+a) % 360

  # Emails that nave no-reply or similar phrases in them are likely not a
  # human. As such it's not worth the cost to do a lookup on that person.
  #
  # Also emails that are really long are likely computer-generated email
  # strings used for bcc-based automated teasks.
  likelyNonHumanEmail: (email) ->
    prefixes = [
      "noreply"
      "no-reply"
      "donotreply"
      "do-not-reply"
      "bounce[s]?@"
      "notification[s]?@"
      "support@"
      "alert[s]?@"
      "news@"
      "info@"
      "automated@"
      "list[s]?@"
      "distribute[s]?@"
      "catchall@"
      "catch-all@"
    ]
    reStr = "(#{prefixes.join("|")})"
    re = new RegExp(reStr, "gi")
    return re.test(email) or email.length > 64

  # Does the several tests you need to determine if a test range is within
  # a bounds. Expects both objects to have `start` and `end` keys.
  # Compares any values with <= and >=.
  overlapsBounds: (bounds, test) ->
    # Fully enclosed
    (test.start <= bounds.end and test.end >= bounds.start) or

    # Starts in bounds. Ends out of bounds
    (test.start <= bounds.end and test.start >= bounds.start) or

    # Ends in bounds. Starts out of bounds
    (test.end >= bounds.start and test.end <= bounds.end) or

    # Spans entire boundary
    (test.end >= bounds.end and test.start <= bounds.start)

  mean: (values = []) ->
    if values.length is 0 then throw new Error("Can't average zero values")
    sum = values.reduce(((sum, value) -> sum + value), 0)
    return sum / values.length
