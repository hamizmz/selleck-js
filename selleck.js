window.selleck = new (function(window) {
	this.Templater = new (function(document) {
		function ITemplate() {
			this.render = function(model) {};
		};
		
		function TextTemplate(textnode, property) {
			this.implement = ITemplate;
			this.implement();
			
			this.render = function(model) {
				var value = model[property];
				textnode.textContent = typeof value === 'function' ? value() : value;
			};
		};
		
		function BlockTemplate(property) {
			this.implement = ITemplate;
			this.implement();
			
			this.children = [];
			this.inverse = null;
			
			function hide_block(model) {
				
			};
			
			function render_block(model) {
				
			};
			
			var render_bool = function(bool, model) {
				if (bool) {
					if (this.inverse)
						this.inverse.hide();
					render_block(model);
				} else if (this.inverse) {
					hide_block(model);
					this.inverse.render(model);
				}
			}.bind(this);
			
			function render_list(list) {
				// Solve the problem: How do I copy nodes and junk?
			};
			
			function render_obj() {
				
			};
			
			this.render = function(model) {
				var value = model[property];
				if (typeof value === 'boolean')
					render_bool(value, model);
				else if (value.constructor === Array)
					render_list(value);
				else
					render_obj(value);
			};
		};
		
		function InverseTemplate() {
			this.implement = ITemplate;
			this.implement();
			
			this.children = [];
			
			this.render = function(model) {
				
			};
		};
		
		this.create_text = function(dom, property) {
			
		};
		
		this.create_block = function(dom_list, property) {
			
		};
		
		this.create_inverse = function(block, dom_list) {
			
		};
		
		this.create_node = function(dom) {
			
		};
		
	})(window.document);
	
	
})(window);
