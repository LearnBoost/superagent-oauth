
module.exports = function (superagent) {

  /**
   * Module dependencies.
   */

  var Request = superagent.Request;

  /**
   * Override .query() to collect the query values.
   * XXX: it would be nice if superagent offered an API for this...
   *
   * @api public
   */

  var oldQuery = Request.prototype.query;

  Request.prototype.query = function (obj) {
    if (!this._oauth_query) this._oauth_query = {};
    // merge
    var keys = Object.keys(obj), key;
    for (var i = 0; i < keys.length; i++) {
      key = keys[i];
      this._oauth_query[key] = obj[key];
    }
    return oldQuery.call(this, obj);
  };

  /**
   * Add sign method.
   *
   * Options:
   *  - accessField (`String`) defaults to `oauth_token`
   *
   * @param {OAuth|OAuth2} oa instance
   * @param {String} token
   * @param {String} secret (only for OAuth 1.0/1.0a)
   * @api public
   */

  Request.prototype.sign = function (oa, token, secret) {
    this.oa = oa;
    this.token = token;
    this.secret = secret;
    return this;
  };

  /**
   * Signs the request for OAuth.
   *
   * @param {Function} callback
   * @api private
   */

  Request.prototype.signOAuth = function () {
    var params = this.oa._prepareParameters(
        this.token
      , this.secret
      , this.method
      , this.url
      , this._data || this._oauth_query // XXX: what if there's query and body? merge?
    );

    var header = this.oa._isEcho
          ? 'X-Verify-Credentials-Authorization'
          : 'Authorization'
      , signature = this.oa._buildAuthorizationHeaders(params)

    this.set(header, signature);
  };

  /**
   * Signs the request for OAuth2.
   *
   * @api private
   */

  Request.prototype.signOAuth2 = function () {
    var query = {};
    query[this.oa._accessTokenName] = this.token;
    this.query(query);
  };

  /**
   * Overrides .end() to add the OAuth 1.0 "Authorization" header field.
   */

  var oldEnd = Request.prototype.end;

  Request.prototype.end = function () {
    this.end = oldEnd;

    if (this.oa && !this.oa._request) {
      this.signOAuth();
    }

    return this.end.apply(this, arguments);
  }

  /**
   * Overrides .request() to add the OAuth2 access token query param if needed.
   * This cannot happen during .end() because the "query" params get processed
   * before that here in the request() function.
   */

  var oldRequest = Request.prototype.request;

  Request.prototype.request = function () {
    this.request = oldRequest;

    if (this.oa && this.oa._request) {
      this.signOAuth2();
    }

    return this.request();
  };

}
