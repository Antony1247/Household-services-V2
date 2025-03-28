export default {
    template: `
    <div>
        <nav class="navbar navbar-dark bg-dark">
            <div class="container-fluid">
                <a class="navbar-brand" href="/#/customer-dashboard">Customer Dashboard</a>
                <div>
                    <router-link to="/current-bookings" class="nav-link d-inline text-white">My Bookings</router-link>
                    <router-link to="/booking-history" class="nav-link d-inline text-white">Booking History</router-link>
                    <router-link to="/profile" class="nav-link d-inline text-white">My Profile</router-link>
                    <router-link to="/customer-search" class="nav-link d-inline text-white">Search</router-link>
                    <button @click="logout" class="btn btn-danger ms-3">Logout</button>
                </div>
            </div>
        </nav>

        <div class="container mt-5">
            <h1 class="text-center">Booking History</h1>
            <table class="table table-bordered mt-3">
                <thead class="table-dark">
                    <tr>
                        <th>ID</th>
                        <th>Service</th>
                        <th>Status</th>
                        <th>Booking Date</th>
                        <th>Booking Time</th>
                        <th>Rating</th>
                        <th>Review</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="booking in bookingHistory" :key="booking.id">
                        <td>{{ booking.id }}</td>
                        <td>{{ booking.service_name }}</td>
                        <td :class="getStatusClass(booking.status)">{{ booking.status }}</td>
                        <td>{{ booking.booking_date }}</td>
                        <td>{{ booking.booking_time }}</td>
                        <td>{{ booking.rating !== 'N/A' ? booking.rating : 'No Rating' }}</td>
                        <td>{{ booking.review !== 'No review' ? booking.review : 'No Review' }}</td>
                        <td>
                            <button v-if="booking.status === 'Completed' && booking.rating === 'N/A'" class="btn btn-success" @click="openReviewModal(booking)">Write Review</button>
                        </td>
                    </tr>
                </tbody>
            </table>
            <p v-if="bookingHistory.length === 0" class="text-center mt-3">No completed or rejected bookings found.</p>
        </div>

        <!-- Review Modal -->
        <div v-if="showReviewModal" class="modal fade show d-block" style="background: rgba(0,0,0,0.5)">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Write a Review</h5>
                        <button type="button" class="close" @click="closeReviewModal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form @submit.prevent="submitReview">
                            <div class="mb-3">
                                <label>Rating (1-5)</label>
                                <select class="form-control" v-model="reviewData.rating" required>
                                    <option value="" disabled>Select rating</option>
                                    <option v-for="num in 5" :key="num" :value="num">{{ num }}</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label>Review</label>
                                <textarea class="form-control" v-model="reviewData.review" required></textarea>
                            </div>
                            <button type="submit" class="btn btn-primary">Submit Review</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,
    data() {
        return {
            bookingHistory: [],
            showReviewModal: false,
            reviewData: {
                bookingId: null,
                rating: "",
                review: ""
            }
        };
    },
    methods: {
        async fetchBookingHistory() {
            try {
                const response = await axios.get('/api/booking_history', {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });

                // Filter only completed or rejected bookings
                this.bookingHistory = response.data.booking_history.filter(
                    booking => booking.status === "Completed" || booking.status === "Rejected"
                );
            } catch (error) {
                console.error("Error fetching booking history:", error);
            }
        },
        openReviewModal(booking) {
            this.reviewData.bookingId = booking.id;
            this.reviewData.rating = "";
            this.reviewData.review = "";
            this.showReviewModal = true;
        },
        closeReviewModal() {
            this.showReviewModal = false;
            this.reviewData = { bookingId: null, rating: "", review: "" };
        },
        async submitReview() {
            try {
                await axios.put(`/api/review_booking/${this.reviewData.bookingId}`, {
                    rating: this.reviewData.rating,
                    review: this.reviewData.review
                }, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });

                alert("Review submitted successfully!");
                this.closeReviewModal();
                this.fetchBookingHistory();
            } catch (error) {
                console.error("Error submitting review:", error);
                alert("Failed to submit review.");
            }
        },
        getStatusClass(status) {
            if (status === "Completed") return "text-success";
            if (status === "Rejected") return "text-danger";
            return "";
        },
        logout() {
            axios.post('/api/logout', {}, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
                .then(() => {
                    localStorage.clear();
                    window.location.href = "/#/login";
                })
                .catch(error => console.error(error));
        }
    },
    mounted() {
        this.fetchBookingHistory();
    }
};
