import { NotFoundError } from 'auth0-extension-tools';

import { getScript } from '../scripts';
import * as constants from '../../constants';


module.exports.checkAccess = (scriptManager) => (req, res, next) => {
  if (req.user.role === constants.SUPER_ACCESS_LEVEL) return next();

  return req.auth0.users.get({ id: req.params.id })
    .then(user => {
      if (!user) {
        next(new NotFoundError('User not found'));
      }

      const accessContext = {
        request: {
          user: req.user
        },
        payload: {
          user
        }
      };

      return scriptManager.execute('access', accessContext);
    })
    .then(next)
    .catch(next);
};

module.exports.prepareUser = (req, res, next) => {
  if (req.user.role === constants.SUPER_ACCESS_LEVEL) return next();

  return getScript(req.storage, 'write')
    .then(script => {
      if (script) {
        try {
          script(req.user, req.body, () => next());
        } catch (err) {
          next(err);
        }
      } else {
        next();
      }
    })
    .catch(next);
};

module.exports.updateFilter = (req, res, next) => {
  if (req.user.role === constants.SUPER_ACCESS_LEVEL) return next();

  return getScript(req.storage, 'filter')
    .then(script => {
      const request = req;
      const query = req.query.search || '';

      if (!script) {
        return next();
      }

      try {
        script(req.user, (err, filter) => {
          request.query.search = (query && filter) ? `(${query}) AND ${filter}` : query || filter;
          next(err);
        });
      } catch (err) {
        next(err);
      }

      return null;
    })
    .catch(next);
};
