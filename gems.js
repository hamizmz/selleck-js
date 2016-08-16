gems = new (function Gems() {
	var Channel = this.Channel = function Channel() {
		var _items = [];
		function get_find_callback(callback) {
			return function(func, index, array) {
				if (func === callback)
					array.splice(index, 1);
			};
		};
		var get_broadcaster = function(args) {
			var stop = false;
			return function(item) {
				if (stop)
					return;
				if (item.apply(this, args) === false)
					stop = true;
			};
		};
		this.connect = function(callback, force_to_front) {
			if (!callback)
				throw 'Dude... pass a callback';
			if (force_to_front)
				_items.splice(0, 0, callback);
			else
				_items.push(callback);
		};
		this.disconnect = function(callback) {
			_items.forEach(get_find_callback(callback));
		};
		this.broadcast = function() {
			_items.slice(0).forEach(get_broadcaster(arguments));
		};
		this.clear = function() {
			_items = [];
		};
	};
	
	var next_item = function(_queue) {
		_queue.shift()(new Queue(_queue).next);
	};
	// Todo: maybe make Queue a bit more flexible?
	// the global _queue should actually be a variable that is read when some
	// other function is called?  Perhaps start() or run()?
	var Queue = this.Queue = function Queue(_queue) {
		var _called = false;
		this.next = function(new_queue) {
			if (_called)
				return;
			_called = true;
			if (new_queue)
				_queue = new_queue.concat(_queue);
			next_item(_queue);
		};
	};

	var Dispatcher = this.Dispatcher = function Dispatcher() {
		var _channels = {};
		var _off = false;
		function get_channel(name) {
			if (_channels.hasOwnProperty(name))
				return _channels[name];
			return _channels[name] = new Channel();
		};
		function delete_channel(name) {
			delete _channels[name];
		};
		function get_oncer(self, name, cb) {
			return function hidden(e) {
				cb(e);
				self.unbind(name, hidden);
			};
		};
		this.bind = function(name, callback, force_to_front) {
			get_channel(name).connect(callback, force_to_front);
		};
		this.unbind = function(name, callback) {
			if (_channels.hasOwnProperty(name))
				_channels[name].disconnect(callback);
		};
		this.bind_once = function(name, callback) {
			this.bind(name, get_oncer(this, name, callback));
		}.bind(this);
		this.publish = this.dispatch = function(name, data) {
			if (_off || !_channels.hasOwnProperty(name))
				return;
			_channels[name].broadcast(data);
		};
		this.on = function() {
			_off = false;
		};
		this.off = function() {
			_on = true;
		};
		this.kill_channel = function(name) {
			if (_channels.hasOwnProperty(name))
				delete_channel(name);
		};
		this.kill_all = function() {
			Object.keys(_channels).forEach(delete_channel);
		};
	};

	function Change(_model, _prop, _val, _oldval) {
		this.property = _prop || '';
		this.new_value = _val;
		this.old_value = _oldval;
		this.model = _model;
	};

	var Model = this.Model = function Model(_attributes, _to_save, _id) {
		this.extend = Dispatcher;
		this.extend();
		delete this.extend;
		var _props = {};
		var _persistent = {};
		
		function __constructor__(obj) {
			if (!obj)
				obj = this;
			for (var prop in obj) {
				var val = obj[prop];
				if (typeof val !== 'function') {
					_props[prop] = val;
					if (_to_save)
						_persistent[prop] = _to_save.indexOf(prop) > -1;
					this.__defineGetter__(prop, getter.bind(this, prop));
					this.__defineSetter__(prop, setter.bind(this, prop));
				}
			}
			
			this.raw = _props;
			delete _attributes;
		};
		function getter(prop) {
			return _props[prop];
		};
		function setter(prop, val) {
			var oldVal = _props[prop];
			_props[prop] = val;

			if (oldVal !== val) {
				var change = new Change(this, prop, val, oldVal);
				this.publish(prop, change);
				this.publish('any', change);

				if (_persistent[prop])
					setTimeout(save, 1000);
			}
		};
		
		this.open = function(name, callback) {
			var value = _props[name];
			if (gems.has_value(value))
				callback(new Change(this, name, value, null));
			this.bind(name, callback);
		}.bind(this);
		
		this.close = this.unbind;
		
		this.toJSON = function() {
			return _props;
		};
		
		__constructor__.call(this, _attributes);
	};

	function on_index(e) {
		if (e.new_value < -1) {
			e.model.selected_index = -1;
			return false;
		}
		if (e.new_value > e.model.items.length - 1) {
			e.model.selected_index = e.model.items.length - 1;
			return false;
		}
		e.model.selected_item = e.new_value === -1 ? null : e.model.items[e.new_value];
		return true;
	};
	function on_item(e) {
		if (!e.new_value)
			e.model.selected_index = -1;
		e.model.items.forEach(function(item, index) {
			if (item === e.new_value)
				e.model.selected_index = index;
		});
	};
	var Options = this.Options = function Options(_items, _save) {
		_save = !_save && _save !== false ? true : _save;
		this.extend = Model;
		this.extend({
			items: _items,
			selected_index: -1,
			selected_item: null
		}, _save ? ['selected_index'] : null);
		delete this.extend;
		this.select_none = function() {
			this.selected_index = -1;
		}.bind(this);
		
		this.bind('selected_item', on_item);
		this.bind('selected_index', on_index);
		
		// TODO: Implement next() and prev()
	};
	
	var Source = this.Source = function Source(_name, _parent) {
		this.parent = _parent || null;
		this.value = null;
		var _relay = new Channel();
		function __constructor__() {
			if (_parent && typeof _name === 'string')
				setup_listener(_name, _parent);
			else if (typeof _name === 'object')
				this.value = _name;
		};
		var setup_listener = function(name, parent) {
			parent.open(on_parent_change);
		}.bind(this);
		function destroy_listener(parent) {
			parent.close(on_parent_change);
			if (is_model(parent.value))
				unbind(parent.value);
		};
		function is_model(val) {
			return val && typeof val === 'object' && typeof val.bind === 'function';
		};
		function attach(model) {
			model.open(_name, on_property_change);
		};
		function detach(model) {
			model.close(_name, on_property_change);
		};
		var make_null = function() {
			var old_value = this.value;
			this.value = null;
			_relay.broadcast(new Change(this, _name, null, old_value));
		}.bind(this);
		function on_parent_change(e) {
			if (is_model(e.old_value)) {
				detach(e.old_value);
				make_null();
			}
			if (is_model(e.new_value))
				attach(e.new_value);
		};
		var on_property_change = function(e) {
			this.value = e.new_value;
			_relay.broadcast(e);
		}.bind(this);
		this.attach = function(name) {
			return new Source(name, this);
		}.bind(this);
		this.open = function(callback) {
			_relay.connect(callback);
			if (gems.has_value(this.value))
				callback(new Change(this, _name, this.value, null));
		}.bind(this);
		this.close = function(callback) {
			// What if I close it off from a parent?  Do the children disipate?  I guess so, eh?  We shoud test this...
			if (!callback) {
				_relay.kill();
				destroy_listener(_parent);
			} else
				_relay.disconnect('change', callback);
		}.bind(this);
		__constructor__.call(this);
	};
	this.attach = function(model) {
		return new Source(model);
	};
	this.has_value = function(val) {
		return val !== null && val !== undefined;
	};
})();
