// Inparams for $ and undefined to make sure these arent overrided.
(function ($, undef) {
    "use strict";	// good stuff.

	// "Constructor" for Game object.
	var Game = function(container, sizeIn, winCount) {
		this.size = sizeIn || this.size; // grab default size if no size param specified.
		this.countToWin = winCount || this.countToWin; // grab default count if no param specified.
		this.countToWin = this.countToWin > this.size ? this.size : this.countToWin; // Make sure winning doesnt require more than we have.
		this.$container = $(container);
		
		this.createBoard();
	};
	
	Game.prototype = {
		size: 3, // default size.
		countToWin: 3,
		count: 0,
	
		player: [{marker: "X", color: "#F00" }, {marker: "O", color: "#00F" }, {marker: "H", color: "#0F0"}],
		currentPlayer: -1,
		
		// Initial setup of gameboard.
		createBoard: function() {
			// Create array of rows and cells
			this.resetBoard();
			
			// Template for gameboard.
			var source = $("#gameboard-template").html();
			var template = Handlebars.compile(source);
			
			// Setup template used for marker placement.
			var playerSource = $("#player-template").html();
			this.playerTmpl = Handlebars.compile(playerSource);
			
			// Create gameboard and show it
			this.$board = $(template(this));
			this.$board.find(".ttt-row").css("height", 100/this.size  + "%");
			this.$board.find(".ttt-cell").css("width", 100/this.size  + "%");
			this.$container.prepend(this.$board);
			
			this.$board.find(".ttt-new-grid").val(this.size);
			this.$board.find(".ttt-new-count").val(this.countToWin);
			
			// Slide down fancily and call resize markers afterwards so they are properly calculated.
			this.$board.slideDown(1000, $.proxy(this.resizeMarkers, this));
			
			// Bind on clicks.
			this.bindInterface();
						
			// Set next player.
			this.setNextPlayer();
		},
		
		// Set size to be used by markers, depending on the size of a cell.
		resizeMarkers: function() {
			var $cells = this.$board.find(".ttt-cell");
			var height = $cells.height();
			var width = $cells.width();
			
			this.$board.find(".ttt-board").css('font-size', (height > width ? width : height)+'px');
		},
		
		// Bind interface so stuff happens (Y)
		bindInterface: function() {
			this.$board.find(".ttt-cell").on('click', $.proxy(this.cellClick, this));
			this.$board.find(".ttt-new").on('click', $.proxy(this.addGame, this));
			this.$board.find(".ttt-reset").on('click', $.proxy(this.resetGame, this));
			this.$board.find(".ttt-remove").on('click', $.proxy(this.removeGame, this));
			
			// Make sure marker sizes are changed on window resize.
			$(window).resize($.proxy(this.resizeMarkers, this));
		},
		
		// Creates a new array for the board cells.
		resetBoard: function() {
			this.board = [];
		
			for(var y = 0; y < this.size; y++) {
				this.board.push(new Array(this.size));
			}
		},
		
		// Self remove game.
		removeGame: function() {
			this.$board.slideUp(1000, function() {
				this.$board.remove();
			}); // remove html containers.
		},
		
		addGame: function() {
			var grid = parseInt(this.$board.find(".ttt-new-grid").val());
			var count = parseInt(this.$board.find(".ttt-new-count").val());
			
			ttt.newGame(this.$container, grid, count);
		},
		
		// Resets the game.
		resetGame: function() {
			// Reset cells.
			this.resetBoard();
			
			// Reset current player.
			this.currentPlayer = -1;
			this.setNextPlayer();
			
			this.count = 0;
			
			// Empty the board.
			this.$board.find(".ttt-cell").html("");
			
			// Remove winner text.
			this.$board.find(".ttt-winner").text("");
			
			this.finished = false;
		},
		
		// Triggered upon clicking of a cell.
		cellClick: function(event) {
			if(this.finished) return;
			
			// Figure out which cell was clicked.
			var y = this.$board.find(event.currentTarget.parentElement).index();
			var x = this.$board.find(event.currentTarget).index();
			
			// Get cell from board.
			var cell = this.board[y][x];
			
			// Check if valid placement.
			if(cell !== undef) {
				// warn of invalid placement.
			} else {
				this.board[y][x] = this.getPlayer(); // Mark cell by player.
				
				// Put players mark in cell.
				$(event.currentTarget).html($(this.playerTmpl(this.getPlayer())));
				
				// Track moves done.
				this.count++;
				
				// Win check.
				var hasWin = this.checkWinXY(y, x);
				if(!hasWin) {
					if(this.count == this.size * this.size)
						this.gg("Draw!");
					else	
						this.setNextPlayer();
				} else {
					this.gg(this.getPlayer().marker + " wins!");
				}
			}
		},
		
		// Check if either horizontal, vertical or diagonal gives a win!
		checkWinXY: function(y, x) {
			return this.checkRecWin(y, x, 0, 1) || this.checkRecWin(y, x, 1, 0) || this.checkRecWin(y, x, 1, 1) || this.checkRecWin(y, x, 1, -1);
		},

		// Performs recursive checks starting from x,y in direction dy,dx and opposite. +1 for marker at x,y
		checkRecWin: function(y, x, dy, dx) {
			return (1 + this.countXYRec(y, x, dy, dx) + this.countXYRec(y, x, -dy, -dx)) >= this.countToWin;
		},
		
		// Recursive check for matches to previous marker.
		countXYRec: function(y, x, dy, dx) {
			var calcY = y+dy, calcX = x+dx;
			
			if(this.validCoord(calcY, calcX) && this.board[y][x] === this.board[calcY][calcX])
				return 1 + this.countXYRec(calcY, calcX, dy, dx);
				
			return 0;
		},
		
		// Checks if coordinates within bounds
		validCoord: function(y, x) {
			return !(x < 0 || x >= this.size || y < 0 || y >= this.size);
		},
		
		// Show win/draw, and spawn new game.
		gg: function(msg) {
			this.finished = true;
			this.$board.find(".ttt-winner").text(msg);

			ttt.newGame(this.$container, this.size);
		},
		
		// Returns the current player object.
		getPlayer: function() {
			return this.player[this.currentPlayer];
		},
		
		// Circulates to the next player.
		setNextPlayer: function() {
			// Calc next player.
			this.currentPlayer = (this.currentPlayer+1) % this.player.length;

			// Shows the player as the next player.
			this.$board.find(".ttt-player").html(this.playerTmpl(this.getPlayer()));
		},
	};
	
	// Create object in window scope
	window.ttt = { games: [] };
	
	// bind a new game function to our object.
	ttt.newGame = function(container, size, winCount) {
		ttt.games.push(new Game(container, size, winCount));
	}
	
	// For good manners map the constructor 
	ttt.newGame.Constructor = Game;
})(window.jQuery); // undef arg is supposed to be missing, since that will put undefined.

// Separate file
// Uh create a game so theres something when we load up ;)
$(function() {
	ttt.newGame(".container");
});
