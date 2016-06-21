let rules = require("./logic/rules.js");
let playgame_site = require("./site/playgame.js");
let strategy = require("./logic/strategy.js");

// Save a little bit of screenspace...
let MOVES = rules.MOVES;
let move_class = rules.move_class;

function valid_move(the_move, node, move_stack) {
	return (the_move !== undefined && node !== undefined) &&
		((the_move === MOVES["HTB"] && rules.can_htb(node, move_stack)) ||
		(the_move === MOVES["CB"] && rules.can_cb(node, move_stack)) ||
		(the_move === MOVES["CONCEDE"] && rules.can_concede(node, move_stack)) ||
		(the_move === MOVES["RETRACT"] && rules.can_retract(node, move_stack)));
}

function make_move(the_move, node, move_stack) {
	if(the_move === MOVES["HTB"]) {
		node.addClass(move_class("HTB"));

	} else if(the_move === MOVES["CB"]) {
		node.addClass(move_class("CB"));

	} else if(the_move === MOVES["CONCEDE"]) {
		node.removeClass(move_class("HTB"));
		node.addClass(move_class("CONCEDE"));

	} else if(the_move === MOVES["RETRACT"]) {
		node.removeClass(move_class("CB"));
		node.addClass(move_class("RETRACT"));
	}

	let last_node = move_stack.slice(-1)[0];
	if(node !== last_node) {
		move_stack.push(node);
	}
}

function strategy_move(cy, is_proponent) {
	if (cy.game_play_stack.length !== 0) {
		let [the_move, node] = strategy.get_move(cy.game_play_stack, is_proponent);
		move(the_move, node, cy.game_play_stack);
	}
}

// Determine the move to make, given a particular node and a
// boolean indicating if the proposer of the move is the
// proponent.
function specific_move(node, is_proponent) {
	let cy = node.cy();

	let the_move = undefined;
	if (is_proponent || cy.game_play_stack.length === 0) {
		the_move = MOVES["HTB"];
	} else {
		if (rules.has_played(node, MOVES["HTB"])) {
			the_move = MOVES["CONCEDE"];
		} else if (rules.has_played(node, MOVES["CB"])) {
			the_move = MOVES["RETRACT"];
		} else if (!(rules.has_played(node, MOVES["CONCEDE"]) || rules.has_played(node, MOVES["RETRACT"]))) {
			the_move = MOVES["CB"];
		}
	}

	return move(the_move, node, cy.game_play_stack);
}

function auto_move(node, is_proponent) {
	let cy = node.cy();

	let new_game = cy.game_play_stack.length === 0;

	let valid = specific_move(node, is_proponent);

	if (valid && !new_game || is_proponent) {
		strategy_move(cy, !is_proponent);
	}

	return valid;
}

function move(the_move, node, move_stack) {
	if(valid_move(the_move, node, move_stack)) {
		make_move(the_move, node, move_stack);

		if (rules.check_termination(the_move, node, move_stack)) {
			let proponent_win = rules.check_proponent_win(the_move, node, move_stack);
			if(proponent_win) {
				alert("Proponent Won!");
			} else {
				alert("Opponent Won!");
			}
			node.cy().game_play_gg = true;
		}
		return true;

	} else {
		return false;
	}
}

function end_game(cy) {
	cy.game_play_stack = [];
	cy.game_play_gg = false;  // Is the game over?

	Object.keys(rules.MOVE_CLASSES).forEach((key) => {
		cy.nodes().removeClass(rules.MOVE_CLASSES[key]);
	});
}

function parse_cytoscape_instance(cy) {
	cy.game_play_possible = false;
	cy.game_play_playing = false;
	cy.game_play_preparing = false;

	end_game(cy);

	cy = playgame_site.parse_cytoscape_instance(cy, auto_move, end_game);

	return cy;
}

module.exports = {
	"parse_cytoscape_instance": parse_cytoscape_instance
}